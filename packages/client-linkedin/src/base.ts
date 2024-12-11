import { EventEmitter } from 'events';
import { Client as LinkedInClient } from 'linkedin-api';
import { elizaLogger } from '@ai16z/eliza';
import { stringToUuid, embeddingZeroVector } from '@ai16z/eliza';

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      try {
        await request();
      } catch (error) {
        console.error('Error processing request:', error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }
    this.processing = false;
  }

  private async exponentialBackoff(retryCount: number) {
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async randomDelay() {
    const delay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export class ClientBase extends EventEmitter {
  private static _linkedInClient: LinkedInClient;
  protected linkedInClient: LinkedInClient;
  protected runtime: any;
  protected profile: any;
  protected requestQueue: RequestQueue = new RequestQueue();

  constructor(runtime: any) {
    super();
    this.runtime = runtime;
    
    if (ClientBase._linkedInClient) {
      this.linkedInClient = ClientBase._linkedInClient;
    } else {
      this.linkedInClient = new LinkedInClient();
      ClientBase._linkedInClient = this.linkedInClient;
    }
  }

  async init() {
    const username = this.runtime.getSetting('LINKEDIN_USERNAME');
    const password = this.runtime.getSetting('LINKEDIN_PASSWORD');

    if (!username || !password) {
      throw new Error('LinkedIn credentials not configured');
    }

    elizaLogger.log('Logging into LinkedIn...');

    try {
      await this.linkedInClient.login(username, password);
      this.profile = await this.fetchProfile();
      
      if (this.profile) {
        elizaLogger.log('LinkedIn profile loaded:', JSON.stringify(this.profile, null, 2));
        this.runtime.character.linkedInProfile = {
          id: this.profile.id,
          username: this.profile.username,
          fullName: this.profile.fullName,
          headline: this.profile.headline,
          summary: this.profile.summary
        };
      } else {
        throw new Error('Failed to load LinkedIn profile');
      }

      await this.loadInitialState();
    } catch (error) {
      elizaLogger.error('LinkedIn login failed:', error);
      throw error;
    }
  }

  async fetchProfile() {
    const cachedProfile = await this.getCachedProfile();
    if (cachedProfile) return cachedProfile;

    try {
      const profile = await this.requestQueue.add(async () => {
        const profileData = await this.linkedInClient.getProfile();
        return {
          id: profileData.id,
          username: profileData.username,
          fullName: profileData.firstName + ' ' + profileData.lastName,
          headline: profileData.headline,
          summary: profileData.summary
        };
      });

      await this.cacheProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      return undefined;
    }
  }

  async loadInitialState() {
    await this.populateConnections();
    await this.populateRecentActivity();
  }

  async populateConnections() {
    const connections = await this.requestQueue.add(async () => {
      return await this.linkedInClient.getConnections();
    });

    for (const connection of connections) {
      const roomId = stringToUuid(`linkedin-connection-${connection.id}`);
      await this.runtime.ensureConnection(
        stringToUuid(connection.id),
        roomId,
        connection.username,
        connection.fullName,
        'linkedin'
      );
    }
  }

  async populateRecentActivity() {
    const activities = await this.requestQueue.add(async () => {
      return await this.linkedInClient.getFeedPosts();
    });

    for (const activity of activities) {
      const roomId = stringToUuid(`linkedin-post-${activity.id}`);
      await this.saveActivity(activity, roomId);
    }
  }

  private async saveActivity(activity: any, roomId: string) {
    const content = {
      text: activity.text,
      url: activity.url,
      source: 'linkedin',
      type: activity.type
    };

    await this.runtime.messageManager.createMemory({
      id: stringToUuid(`${activity.id}-${this.runtime.agentId}`),
      userId: activity.authorId === this.profile.id ? 
        this.runtime.agentId : 
        stringToUuid(activity.authorId),
      content,
      agentId: this.runtime.agentId,
      roomId,
      embedding: embeddingZeroVector,
      createdAt: activity.timestamp
    });
  }

  private async getCachedProfile() {
    return await this.runtime.cacheManager.get(
      `linkedin/${this.runtime.getSetting('LINKEDIN_USERNAME')}/profile`
    );
  }

  private async cacheProfile(profile: any) {
    await this.runtime.cacheManager.set(
      `linkedin/${profile.username}/profile`,
      profile
    );
  }
}