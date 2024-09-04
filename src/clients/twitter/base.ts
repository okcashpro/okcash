import {
  QueryTweetsResponse,
  Scraper,
  SearchMode,
  Tweet,
} from "agent-twitter-client";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { fileURLToPath } from "url";
import { embeddingZeroVector } from "../../core/memory.ts";
import { Content, Memory, State, UUID } from "../../core/types.ts";
import ImageDescriptionService from "../../services/image.ts";

import glob from "glob";
import { stringToUuid } from "../../core/uuid.ts";
import { wait } from "./utils.ts";

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
    if (!tweet) {
      console.warn("Tweet is undefined, skipping cache");
      return;
    }
    const cacheDir = path.join(
      __dirname,
      "../../../tweetcache",
      tweet.conversationId,
      `${tweet.id}.json`,
    );
    await fs.promises.mkdir(path.dirname(cacheDir), { recursive: true });
    await fs.promises.writeFile(cacheDir, JSON.stringify(tweet, null, 2));
    this.tweetCache.set(tweet.id, tweet);
  }

  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    if (this.tweetCache.has(tweetId)) {
      return this.tweetCache.get(tweetId);
    }

    const cacheFile = path.join(
      __dirname,
      "tweetcache",
      "*",
      `${tweetId}.json`,
    );
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

    const tweet = await this.requestQueue.add(() =>
      this.twitterClient.getTweet(tweetId),
    );
    await this.cacheTweet(tweet);
    return tweet;
  }

  callback: (self: ClientBase) => any = null;

  onReady() {
    throw new Error("Not implemented in base class, please call from subclass");
  }

  constructor({ runtime }: { runtime: AgentRuntime }) {
    super();
    this.runtime = runtime;
    if (ClientBase._twitterClient) {
      this.twitterClient = ClientBase._twitterClient;
    } else {
      this.twitterClient = new Scraper();
      ClientBase._twitterClient = this.twitterClient;
    }
    this.directions =
      "- " +
      this.runtime.character.style.all.join("\n- ") +
      "- " +
      this.runtime.character.style.post.join();

    // async initialization
    (async () => {
      // Check for Twitter cookies
      if (settings.TWITTER_COOKIES) {
        const cookiesArray = JSON.parse(settings.TWITTER_COOKIES);
        await this.setCookiesFromArray(cookiesArray);
      } else {
        const cookiesFilePath = path.join(
          __dirname,
          "../../../twitter_cookies.json",
        );
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
              fs.writeFileSync(
                cookiesFilePath,
                JSON.stringify(cookies),
                "utf-8",
              );
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
      const userId = await this.twitterClient.getUserIdByScreenName(
        settings.TWITTER_USERNAME,
      );
      this.twitterUserId = userId;

      await this.populateTimeline();

      this.onReady();
    })();
  }

  async fetchSearchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode,
    cursor?: string,
  ): Promise<QueryTweetsResponse> {
    // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
    // if we dont get a response in 5 seconds, something is wrong
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout waiting for Twitter API response")),
        5000,
      ),
    );

    try {
      const result = await Promise.race([
        this.twitterClient.fetchSearchTweets(
          query,
          maxTweets,
          searchMode,
          cursor,
        ),
        timeoutPromise,
      ]);
      return (result ?? { tweets: [] }) as QueryTweetsResponse;
    } catch (error) {
      console.error("Error fetching search tweets:", error);
      return { tweets: [] };
    }
  }

  private async populateTimeline() {
    const cacheFile = "timeline_cache.json";

    // Check if the cache file exists
    if (fs.existsSync(cacheFile)) {
      // Read the cached search results from the file
      const cachedResults = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));

      // Check if the cached results exist in the database
      const existingMemories =
        await this.runtime.messageManager.getMemoriesByRoomIds({
          roomIds: cachedResults.map((tweet) =>
            stringToUuid(tweet.conversationId),
          ),
        });

      if (existingMemories.length === cachedResults.length) {
        console.log(
          "Cached results already exist in the database. Skipping timeline population.",
        );
        return;
      }
    }

    // Get the most recent 20 mentions and interactions
    const mentionsAndInteractions = await this.fetchSearchTweets(
      `@${settings.TWITTER_USERNAME}`,
      20,
      SearchMode.Latest,
    );

    // Combine the timeline tweets and mentions/interactions
    const allTweets = [...mentionsAndInteractions.tweets];

    // Create a Set to store unique tweet IDs
    const tweetIdsToCheck = new Set<string>();

    // Add tweet IDs to the Set
    for (const tweet of allTweets) {
      tweetIdsToCheck.add(tweet.id);
    }

    // Convert the Set to an array of UUIDs
    const tweetUuids = Array.from(tweetIdsToCheck).map((id) =>
      stringToUuid(id),
    );

    // Check the existing memories in the database
    const existingMemories =
      await this.runtime.messageManager.getMemoriesByRoomIds({
        roomIds: tweetUuids,
      });

    // Create a Set to store the existing memory IDs
    const existingMemoryIds = new Set<UUID>(
      existingMemories.map((memory) => memory.roomId),
    );

    // Filter out the tweets that already exist in the database
    const tweetsToSave = allTweets.filter(
      (tweet) => !existingMemoryIds.has(stringToUuid(tweet.id)),
    );

    await this.runtime.ensureUserExists(
      this.runtime.agentId,
      settings.TWITTER_USERNAME,
      this.runtime.character.name,
      "twitter",
    );

    // Save the new tweets as memories
    for (const tweet of tweetsToSave) {
      const roomId = stringToUuid(tweet.conversationId);
      const tweetuserId = stringToUuid(tweet.userId);

      await this.runtime.ensureRoomExists(roomId);
      // ensure user is in the room
      await this.runtime.ensureParticipantExists(this.runtime.agentId, roomId);

      await this.runtime.ensureUserExists(
        tweetuserId,
        tweet.username,
        tweet.name,
        "twitter",
      );
      await this.runtime.ensureParticipantExists(tweetuserId, roomId);
      const content = {
        text: tweet.text,
        url: tweet.permanentUrl,
        inReplyTo: tweet.inReplyToStatusId
          ? stringToUuid(tweet.inReplyToStatusId)
          : undefined,
      } as Content;
      await this.runtime.messageManager.createMemory({
        id: stringToUuid(tweet.id),
        userId: tweetuserId,
        content: content,
        roomId,
        embedding: embeddingZeroVector,
        createdAt: new Date(tweet.timestamp * 1000),
      });
    }

    // Cache the search results to the file
    fs.writeFileSync(cacheFile, JSON.stringify(allTweets));
  }

  async setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`,
    );
    await this.twitterClient.setCookies(cookieStrings);
  }

  async saveRequestMessage(message: Memory, state: State) {
    if (message.content.text) {
      const recentMessage = await this.runtime.messageManager.getMemories({
        roomId: message.roomId,
        count: 1,
        unique: false,
      });

      if (
        recentMessage.length > 0 &&
        recentMessage[0].content === message.content
      ) {
        console.log("Message already saved", recentMessage[0].id);
      } else {
        await this.runtime.messageManager.createMemory({
          ...message,
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
