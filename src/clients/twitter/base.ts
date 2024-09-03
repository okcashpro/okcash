import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { fileURLToPath } from "url";
import { embeddingZeroVector } from "../../core/memory.ts";
import { Content, Memory, State, UUID } from "../../core/types.ts";
import ImageDescriptionService from "../../services/image.ts";

import glob from "glob";

export function extractAnswer(text: string): string {
  const startIndex = text.indexOf("Answer: ") + 8;
  const endIndex = text.indexOf("<|endoftext|>", 11);
  return text.slice(startIndex, endIndex);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing: boolean = false;

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

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      try {
        await request();
      } catch (error) {
        console.error("Error processing request:", error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }

    this.processing = false;
  }

  private async exponentialBackoff(retryCount: number): Promise<void> {
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export class ClientBase extends EventEmitter {
  static _twitterClient: Scraper;
  twitterClient: Scraper;
  runtime: AgentRuntime;
  directions: string;
  lastCheckedTweetId: string | null = null;
  imageDescriptionService: ImageDescriptionService;
  temperature: number = 0.5;
  dryRun: boolean = settings.TWITTER_DRY_RUN?.toLowerCase() === "true";

  private tweetCache: Map<string, Tweet> = new Map();
  requestQueue: RequestQueue = new RequestQueue();
  twitterUserId: string;

  async cacheTweet(tweet: Tweet): Promise<void> {
    if(!tweet) {
      console.warn("Tweet is undefined, skipping cache");
      return;
    }
    const cacheDir = path.join(__dirname, "../../../tweetcache", tweet.conversationId, `${tweet.id}.json`);
    await fs.promises.mkdir(path.dirname(cacheDir), { recursive: true });
    await fs.promises.writeFile(cacheDir, JSON.stringify(tweet, null, 2));
    this.tweetCache.set(tweet.id, tweet);
  }

  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    if (this.tweetCache.has(tweetId)) {
      return this.tweetCache.get(tweetId);
    }

    const cacheFile = path.join(__dirname, "tweetcache", "*", `${tweetId}.json`);
    const files = await glob(cacheFile);
    if (files.length > 0) {
      const tweetData = await fs.promises.readFile(files[0], "utf-8");
      const tweet = JSON.parse(tweetData) as Tweet;
      this.tweetCache.set(tweet.id, tweet);
      return tweet;
    }

    return undefined;
  }

  async getTweet(tweetId: string): Promise<Tweet> {
    const cachedTweet = await this.getCachedTweet(tweetId);
    if (cachedTweet) {
      return cachedTweet;
    }

    const tweet = await this.requestQueue.add(() => this.twitterClient.getTweet(tweetId));
    await this.cacheTweet(tweet);
    return tweet;
  }

  callback: (self: ClientBase) => any = null;

  onReady() {
    throw new Error("Not implemented in base class, please call from subclass");
  }

  constructor({
    runtime,
    callback = null,
  }: {
    runtime: AgentRuntime;
    callback?: (self: ClientBase) => any;
  }) {
    super();
    this.runtime = runtime;
    if(ClientBase._twitterClient) {
      this.twitterClient = ClientBase._twitterClient;
      console.log('******** using cached twitter client');
    } else {
      this.twitterClient = new Scraper();
      ClientBase._twitterClient = this.twitterClient;
      console.log('******** using new twitter client');
    }
    this.directions =
      "- " +
      this.runtime.character.style.all.join("\n- ") +
      "- " +
      this.runtime.character.style.post.join();
    this.callback = callback;

    // async initialization
    (async () => {
    // Check for Twitter cookies
    if (settings.TWITTER_COOKIES) {
      console.log("settings.TWITTER_COOKIES");
      console.log(settings.TWITTER_COOKIES);
      const cookiesArray = JSON.parse(settings.TWITTER_COOKIES);
      await this.setCookiesFromArray(cookiesArray);
    } else {
      const cookiesFilePath = path.join(__dirname, "../../../twitter_cookies.json");
      if (fs.existsSync(cookiesFilePath)) {
        const cookiesArray = JSON.parse(
          fs.readFileSync(cookiesFilePath, "utf-8"),
        );
        await this.setCookiesFromArray(cookiesArray);
      } else {
        this.twitterClient
          .login(
            settings.TWITTER_USERNAME,
            settings.TWITTER_PASSWORD,
            settings.TWITTER_EMAIL,
          )
          .then(() => {
            console.log("Logged in to Twitter");
            return this.twitterClient.getCookies();
          })
          .then((cookies) => {
            fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies), "utf-8");
          })
          .catch((error) => {
            console.error("Error logging in to Twitter:", error);
          });
      }
    }

      while (!(await this.twitterClient.isLoggedIn())) {
        console.log("Waiting for Twitter login");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log("***** getting twitter userId");
      const userId = await this.twitterClient.getUserIdByScreenName(settings.TWITTER_USERNAME);
      console.log("***** twitter userId is", userId);
      this.twitterUserId = userId;

      console.log("***** populating timeline");
      await this.populateTimeline();
      console.log("***** timeline populated");

      if (callback) {
        callback(this);
      }
    })();
  }

  private async populateTimeline() {  
    // Get the most recent 20 mentions and interactions
    const mentionsAndInteractions = await this.twitterClient.fetchSearchTweets(
      `@${settings.TWITTER_USERNAME}`,
      20,
      SearchMode.Latest,
    );
  
    // Combine the timeline tweets and mentions/interactions
    const allTweets = [...mentionsAndInteractions.tweets];

    console.log("***** all tweets", allTweets.length);
  
    // Create a Set to store unique tweet IDs
    const tweetIdsToCheck = new Set<string>();
  
    // Add tweet IDs to the Set
    for (const tweet of allTweets) {
      tweetIdsToCheck.add(tweet.id);
    }
  
    // Convert the Set to an array of UUIDs
    const tweetUuids = Array.from(tweetIdsToCheck).map((id) => getUuid(id) as UUID);

    console.log("***** tweetUuids", tweetUuids.length);
  
    // Check the existing memories in the database
    const existingMemories = await this.runtime.messageManager.getMemoriesByRoomIds({
      room_ids: tweetUuids,
    });

    console.log("***** existingMemories", existingMemories.length);
  
    // Create a Set to store the existing memory IDs
    const existingMemoryIds = new Set<UUID>(existingMemories.map((memory) => memory.room_id));
  
    // Filter out the tweets that already exist in the database
    const tweetsToSave = allTweets.filter((tweet) => !existingMemoryIds.has(getUuid(tweet.id) as UUID));
  
    console.log("***** tweets to save", tweetsToSave.length);
    await this.runtime.ensureUserExists(this.runtime.agentId, settings.TWITTER_USERNAME, this.runtime.character.name);

    // Save the new tweets as memories
    for (const tweet of tweetsToSave) {
      console.log("***** tweet", tweet);
      const room_id = getUuid(tweet.conversationId) as UUID;
      const tweetuserId = getUuid(tweet.userId) as UUID;
  
      await this.runtime.ensureRoomExists(room_id);
      // ensure user is in the room
      console.log("ensure agent is in the room");
      await this.runtime.ensureParticipantExists(this.runtime.agentId, room_id);

      console.log("ensure user exists");
      await this.runtime.ensureUserExists(tweetuserId, tweet.username, tweet.name);
      console.log("ensure participant exists");
      await this.runtime.ensureParticipantExists(tweetuserId, room_id);

      await this.runtime.messageManager.createMemory({
        id: getUuid(tweet.id) as UUID,
        user_id: tweetuserId,
        content: { text: tweet.text, url: tweet.permanentUrl },
        room_id,
        embedding: embeddingZeroVector,
        created_at: new Date(tweet.timestamp),
      });
    }
  }
  

  async setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`,
    );
    await this.twitterClient.setCookies(cookieStrings);
  }

  async saveResponseMessage(
    memory: Memory,
    state: State,
    userName: string = settings.TWITTER_USERNAME,
  ) {
    memory.content.text = memory.content.text?.trim();

    if (memory.content && memory.content.text) {
      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        userName,
        this.runtime.character.name,
      );
      await this.runtime.messageManager.createMemory(
        memory,
        false,
      );
      state = await this.runtime.updateRecentMessageState(state);

      await this.runtime.evaluate(memory, state);
    } else {
      console.warn("Empty response, skipping");
    }
  }

  async saveRequestMessage(message: Memory, state: State) {
    const { content: senderContent } = message;

    if ((senderContent as Content).text) {
      const recentMessage = await this.runtime.messageManager.getMemories({
        room_id: message.room_id,
        count: 1,
        unique: false,
      });

      if (
        recentMessage.length > 0 &&
        recentMessage[0].content === senderContent
      ) {
        console.log("Message already saved", recentMessage);
      } else {
        console.log("Creating memory", {
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
        await this.runtime.messageManager.createMemory({
          id: message.id,
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
      }

      await this.runtime.evaluate(message, {
        ...state,
        twitterClient: this.twitterClient,
      });
    }
  }
}
