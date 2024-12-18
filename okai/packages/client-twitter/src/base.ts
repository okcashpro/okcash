import {
    Content,
    IAgentRuntime,
    IImageDescriptionService,
    Memory,
    State,
    UUID,
    getEmbeddingZeroVector,
    okaiLogger,
    stringToUuid,
} from "@okcashpro/okai";
import {
    QueryTweetsResponse,
    Scraper,
    SearchMode,
    Tweet,
} from "agent-twitter-client";
import { EventEmitter } from "events";

export function extractAnswer(text: string): string {
    const startIndex = text.indexOf("Answer: ") + 8;
    const endIndex = text.indexOf("<|endoftext|>", 11);
    return text.slice(startIndex, endIndex);
}

type TwitterProfile = {
    id: string;
    username: string;
    screenName: string;
    bio: string;
    nicknames: string[];
};

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
    static _twitterClients: { [accountIdentifier: string]: Scraper } = {};
    twitterClient: Scraper;
    runtime: IAgentRuntime;
    directions: string;
    lastCheckedTweetId: bigint | null = null;
    imageDescriptionService: IImageDescriptionService;
    temperature: number = 0.5;

    requestQueue: RequestQueue = new RequestQueue();

    profile: TwitterProfile | null;

    async cacheTweet(tweet: Tweet): Promise<void> {
        if (!tweet) {
            console.warn("Tweet is undefined, skipping cache");
            return;
        }

        this.runtime.cacheManager.set(`twitter/tweets/${tweet.id}`, tweet);
    }

    async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
        const cached = await this.runtime.cacheManager.get<Tweet>(
            `twitter/tweets/${tweetId}`
        );

        return cached;
    }

    async getTweet(tweetId: string): Promise<Tweet> {
        const cachedTweet = await this.getCachedTweet(tweetId);

        if (cachedTweet) {
            return cachedTweet;
        }

        const tweet = await this.requestQueue.add(() =>
            this.twitterClient.getTweet(tweetId)
        );

        await this.cacheTweet(tweet);
        return tweet;
    }

    callback: (self: ClientBase) => any = null;

    onReady() {
        throw new Error(
            "Not implemented in base class, please call from subclass"
        );
    }

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
        const username = this.runtime.getSetting("TWITTER_USERNAME");
        if (ClientBase._twitterClients[username]) {
            this.twitterClient = ClientBase._twitterClients[username];
        } else {
            this.twitterClient = new Scraper();
            ClientBase._twitterClients[username] = this.twitterClient;
        }

        this.directions =
            "- " +
            this.runtime.character.style.all.join("\n- ") +
            "- " +
            this.runtime.character.style.post.join();
    }

    async init() {
        //test
        const username = this.runtime.getSetting("TWITTER_USERNAME");
        const password = this.runtime.getSetting("TWITTER_PASSWORD");
        const email = this.runtime.getSetting("TWITTER_EMAIL");
        const twitter2faSecret =
            this.runtime.getSetting("TWITTER_2FA_SECRET") || undefined;
        const cookies = this.runtime.getSetting("TWITTER_COOKIES");

        if (!username) {
            throw new Error("Twitter username not configured");
        }
        // Check for Twitter cookies
        if (cookies) {
            okaiLogger.debug("Using cookies from settings");
            const cookiesArray = JSON.parse(cookies);

            await this.setCookiesFromArray(cookiesArray);
        } else {
            okaiLogger.debug("No cookies found in settings");
            okaiLogger.debug("Checking for cached cookies");
            const cachedCookies = await this.getCachedCookies(username);
            if (cachedCookies) {
                await this.setCookiesFromArray(cachedCookies);
            }
        }

        okaiLogger.log("Waiting for Twitter login");
        let retries = 5; // Optional: Set a retry limit
        while (retries > 0) {
            const cookies = await this.twitterClient.getCookies();
            if ((await this.twitterClient.isLoggedIn()) && !!cookies) {
                okaiLogger.info("Already logged in.");
                await this.cacheCookies(username, cookies);
                okaiLogger.info("Successfully logged in and cookies cached.");
                break;
            }

            try {
                await this.twitterClient.login(
                    username,
                    password,
                    email,
                    twitter2faSecret
                );
            } catch (error) {
                okaiLogger.error(`Login attempt failed: ${error.message}`);
            }

            retries--;
            okaiLogger.error(
                `Failed to login to Twitter. Retrying... (${retries} attempts left)`
            );

            if (retries === 0) {
                okaiLogger.error(
                    "Max retries reached. Exiting login process."
                );
                throw new Error("Twitter login failed after maximum retries.");
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        // Initialize Twitter profile
        this.profile = await this.fetchProfile(username);

        if (this.profile) {
            okaiLogger.log("Twitter user ID:", this.profile.id);
            okaiLogger.log(
                "Twitter loaded:",
                JSON.stringify(this.profile, null, 10)
            );
            // Store profile info for use in responses
            this.runtime.character.twitterProfile = {
                id: this.profile.id,
                username: this.profile.username,
                screenName: this.profile.screenName,
                bio: this.profile.bio,
                nicknames: this.profile.nicknames,
            };
        } else {
            throw new Error("Failed to load profile");
        }

        await this.loadLatestCheckedTweetId();
        await this.populateTimeline();
    }

    async fetchOwnPosts(count: number): Promise<Tweet[]> {
        okaiLogger.debug("fetching own posts");
        const homeTimeline = await this.twitterClient.getUserTweets(
            this.profile.id,
            count
        );
        return homeTimeline.tweets;
    }

    async fetchHomeTimeline(count: number): Promise<Tweet[]> {
        okaiLogger.debug("fetching home timeline");
        const homeTimeline = await this.twitterClient.fetchHomeTimeline(
            count,
            []
        );

        okaiLogger.debug(homeTimeline, { depth: Infinity });
        const processedTimeline = homeTimeline
            .filter((t) => t.__typename !== "TweetWithVisibilityResults") // what's this about?
            .map((tweet) => {
                //console.log("tweet is", tweet);
                const obj = {
                    id: tweet.id,
                    name:
                        tweet.name ?? tweet?.user_results?.result?.legacy.name,
                    username:
                        tweet.username ??
                        tweet.core?.user_results?.result?.legacy.screen_name,
                    text: tweet.text ?? tweet.legacy?.full_text,
                    inReplyToStatusId:
                        tweet.inReplyToStatusId ??
                        tweet.legacy?.in_reply_to_status_id_str ??
                        null,
                    timestamp:
                        new Date(tweet.legacy?.created_at).getTime() / 1000,
                    createdAt:
                        tweet.createdAt ??
                        tweet.legacy?.created_at ??
                        tweet.core?.user_results?.result?.legacy.created_at,
                    userId: tweet.userId ?? tweet.legacy?.user_id_str,
                    conversationId:
                        tweet.conversationId ??
                        tweet.legacy?.conversation_id_str,
                    permanentUrl: `https://x.com/${tweet.core?.user_results?.result?.legacy?.screen_name}/status/${tweet.rest_id}`,
                    hashtags: tweet.hashtags ?? tweet.legacy?.entities.hashtags,
                    mentions:
                        tweet.mentions ?? tweet.legacy?.entities.user_mentions,
                    photos:
                        tweet.photos ??
                        tweet.legacy?.entities.media?.filter(
                            (media) => media.type === "photo"
                        ) ??
                        [],
                    thread: tweet.thread || [],
                    urls: tweet.urls ?? tweet.legacy?.entities.urls,
                    videos:
                        tweet.videos ??
                        tweet.legacy?.entities.media?.filter(
                            (media) => media.type === "video"
                        ) ??
                        [],
                };
                //console.log("obj is", obj);
                return obj;
            });
        //okaiLogger.debug("process homeTimeline", processedTimeline);
        return processedTimeline;
    }

    async fetchTimelineForActions(count: number): Promise<Tweet[]> {
        okaiLogger.debug("fetching timeline for actions");
        const homeTimeline = await this.twitterClient.fetchHomeTimeline(
            count,
            []
        );

        return homeTimeline.map((tweet) => ({
            id: tweet.rest_id,
            name: tweet.core?.user_results?.result?.legacy?.name,
            username: tweet.core?.user_results?.result?.legacy?.screen_name,
            text: tweet.legacy?.full_text,
            inReplyToStatusId: tweet.legacy?.in_reply_to_status_id_str,
            timestamp: new Date(tweet.legacy?.created_at).getTime() / 1000,
            userId: tweet.legacy?.user_id_str,
            conversationId: tweet.legacy?.conversation_id_str,
            permanentUrl: `https://twitter.com/${tweet.core?.user_results?.result?.legacy?.screen_name}/status/${tweet.rest_id}`,
            hashtags: tweet.legacy?.entities?.hashtags || [],
            mentions: tweet.legacy?.entities?.user_mentions || [],
            photos:
                tweet.legacy?.entities?.media?.filter(
                    (media) => media.type === "photo"
                ) || [],
            thread: tweet.thread || [],
            urls: tweet.legacy?.entities?.urls || [],
            videos:
                tweet.legacy?.entities?.media?.filter(
                    (media) => media.type === "video"
                ) || [],
        }));
    }

    async fetchSearchTweets(
        query: string,
        maxTweets: number,
        searchMode: SearchMode,
        cursor?: string
    ): Promise<QueryTweetsResponse> {
        try {
            // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
            // if we dont get a response in 5 seconds, something is wrong
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve({ tweets: [] }), 10000)
            );

            try {
                const result = await this.requestQueue.add(
                    async () =>
                        await Promise.race([
                            this.twitterClient.fetchSearchTweets(
                                query,
                                maxTweets,
                                searchMode,
                                cursor
                            ),
                            timeoutPromise,
                        ])
                );
                return (result ?? { tweets: [] }) as QueryTweetsResponse;
            } catch (error) {
                okaiLogger.error("Error fetching search tweets:", error);
                return { tweets: [] };
            }
        } catch (error) {
            okaiLogger.error("Error fetching search tweets:", error);
            return { tweets: [] };
        }
    }

    private async populateTimeline() {
        okaiLogger.debug("populating timeline...");

        const cachedTimeline = await this.getCachedTimeline();

        // Check if the cache file exists
        if (cachedTimeline) {
            // Read the cached search results from the file

            // Get the existing memories from the database
            const existingMemories =
                await this.runtime.messageManager.getMemoriesByRoomIds({
                    roomIds: cachedTimeline.map((tweet) =>
                        stringToUuid(
                            tweet.conversationId + "-" + this.runtime.agentId
                        )
                    ),
                });

            //TODO: load tweets not in cache?

            // Create a Set to store the IDs of existing memories
            const existingMemoryIds = new Set(
                existingMemories.map((memory) => memory.id.toString())
            );

            // Check if any of the cached tweets exist in the existing memories
            const someCachedTweetsExist = cachedTimeline.some((tweet) =>
                existingMemoryIds.has(
                    stringToUuid(tweet.id + "-" + this.runtime.agentId)
                )
            );

            if (someCachedTweetsExist) {
                // Filter out the cached tweets that already exist in the database
                const tweetsToSave = cachedTimeline.filter(
                    (tweet) =>
                        !existingMemoryIds.has(
                            stringToUuid(tweet.id + "-" + this.runtime.agentId)
                        )
                );

                console.log({
                    processingTweets: tweetsToSave
                        .map((tweet) => tweet.id)
                        .join(","),
                });

                // Save the missing tweets as memories
                for (const tweet of tweetsToSave) {
                    okaiLogger.log("Saving Tweet", tweet.id);

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const userId =
                        tweet.userId === this.profile.id
                            ? this.runtime.agentId
                            : stringToUuid(tweet.userId);

                    if (tweet.userId === this.profile.id) {
                        await this.runtime.ensureConnection(
                            this.runtime.agentId,
                            roomId,
                            this.profile.username,
                            this.profile.screenName,
                            "twitter"
                        );
                    } else {
                        await this.runtime.ensureConnection(
                            userId,
                            roomId,
                            tweet.username,
                            tweet.name,
                            "twitter"
                        );
                    }

                    const content = {
                        text: tweet.text,
                        url: tweet.permanentUrl,
                        source: "twitter",
                        inReplyTo: tweet.inReplyToStatusId
                            ? stringToUuid(
                                  tweet.inReplyToStatusId +
                                      "-" +
                                      this.runtime.agentId
                              )
                            : undefined,
                    } as Content;

                    okaiLogger.log("Creating memory for tweet", tweet.id);

                    // check if it already exists
                    const memory =
                        await this.runtime.messageManager.getMemoryById(
                            stringToUuid(tweet.id + "-" + this.runtime.agentId)
                        );

                    if (memory) {
                        okaiLogger.log(
                            "Memory already exists, skipping timeline population"
                        );
                        break;
                    }

                    await this.runtime.messageManager.createMemory({
                        id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                        userId,
                        content: content,
                        agentId: this.runtime.agentId,
                        roomId,
                        embedding: getEmbeddingZeroVector(),
                        createdAt: tweet.timestamp * 1000,
                    });

                    await this.cacheTweet(tweet);
                }

                okaiLogger.log(
                    `Populated ${tweetsToSave.length} missing tweets from the cache.`
                );
                return;
            }
        }

        const timeline = await this.fetchHomeTimeline(cachedTimeline ? 10 : 50);
        const username = this.runtime.getSetting("TWITTER_USERNAME");

        // Get the most recent 20 mentions and interactions
        const mentionsAndInteractions = await this.fetchSearchTweets(
            `@${username}`,
            20,
            SearchMode.Latest
        );

        // Combine the timeline tweets and mentions/interactions
        const allTweets = [...timeline, ...mentionsAndInteractions.tweets];

        // Create a Set to store unique tweet IDs
        const tweetIdsToCheck = new Set<string>();
        const roomIds = new Set<UUID>();

        // Add tweet IDs to the Set
        for (const tweet of allTweets) {
            tweetIdsToCheck.add(tweet.id);
            roomIds.add(
                stringToUuid(tweet.conversationId + "-" + this.runtime.agentId)
            );
        }

        // Check the existing memories in the database
        const existingMemories =
            await this.runtime.messageManager.getMemoriesByRoomIds({
                roomIds: Array.from(roomIds),
            });

        // Create a Set to store the existing memory IDs
        const existingMemoryIds = new Set<UUID>(
            existingMemories.map((memory) => memory.id)
        );

        // Filter out the tweets that already exist in the database
        const tweetsToSave = allTweets.filter(
            (tweet) =>
                !existingMemoryIds.has(
                    stringToUuid(tweet.id + "-" + this.runtime.agentId)
                )
        );

        okaiLogger.debug({
            processingTweets: tweetsToSave.map((tweet) => tweet.id).join(","),
        });

        await this.runtime.ensureUserExists(
            this.runtime.agentId,
            this.profile.username,
            this.runtime.character.name,
            "twitter"
        );

        // Save the new tweets as memories
        for (const tweet of tweetsToSave) {
            okaiLogger.log("Saving Tweet", tweet.id);

            const roomId = stringToUuid(
                tweet.conversationId + "-" + this.runtime.agentId
            );
            const userId =
                tweet.userId === this.profile.id
                    ? this.runtime.agentId
                    : stringToUuid(tweet.userId);

            if (tweet.userId === this.profile.id) {
                await this.runtime.ensureConnection(
                    this.runtime.agentId,
                    roomId,
                    this.profile.username,
                    this.profile.screenName,
                    "twitter"
                );
            } else {
                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    tweet.username,
                    tweet.name,
                    "twitter"
                );
            }

            const content = {
                text: tweet.text,
                url: tweet.permanentUrl,
                source: "twitter",
                inReplyTo: tweet.inReplyToStatusId
                    ? stringToUuid(tweet.inReplyToStatusId)
                    : undefined,
            } as Content;

            await this.runtime.messageManager.createMemory({
                id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                userId,
                content: content,
                agentId: this.runtime.agentId,
                roomId,
                embedding: getEmbeddingZeroVector(),
                createdAt: tweet.timestamp * 1000,
            });

            await this.cacheTweet(tweet);
        }

        // Cache
        await this.cacheTimeline(timeline);
        await this.cacheMentions(mentionsAndInteractions.tweets);
    }

    async setCookiesFromArray(cookiesArray: any[]) {
        const cookieStrings = cookiesArray.map(
            (cookie) =>
                `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
                    cookie.secure ? "Secure" : ""
                }; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${
                    cookie.sameSite || "Lax"
                }`
        );
        await this.twitterClient.setCookies(cookieStrings);
    }

    async saveRequestMessage(message: Memory, state: State) {
        if (message.content.text) {
            const recentMessage = await this.runtime.messageManager.getMemories(
                {
                    roomId: message.roomId,
                    count: 1,
                    unique: false,
                }
            );

            if (
                recentMessage.length > 0 &&
                recentMessage[0].content === message.content
            ) {
                okaiLogger.debug("Message already saved", recentMessage[0].id);
            } else {
                await this.runtime.messageManager.createMemory({
                    ...message,
                    embedding: getEmbeddingZeroVector(),
                });
            }

            await this.runtime.evaluate(message, {
                ...state,
                twitterClient: this.twitterClient,
            });
        }
    }

    async loadLatestCheckedTweetId(): Promise<void> {
        const latestCheckedTweetId =
            await this.runtime.cacheManager.get<string>(
                `twitter/${this.profile.username}/latest_checked_tweet_id`
            );

        if (latestCheckedTweetId) {
            this.lastCheckedTweetId = BigInt(latestCheckedTweetId);
        }
    }

    async cacheLatestCheckedTweetId() {
        if (this.lastCheckedTweetId) {
            await this.runtime.cacheManager.set(
                `twitter/${this.profile.username}/latest_checked_tweet_id`,
                this.lastCheckedTweetId.toString()
            );
        }
    }

    async getCachedTimeline(): Promise<Tweet[] | undefined> {
        return await this.runtime.cacheManager.get<Tweet[]>(
            `twitter/${this.profile.username}/timeline`
        );
    }

    async cacheTimeline(timeline: Tweet[]) {
        await this.runtime.cacheManager.set(
            `twitter/${this.profile.username}/timeline`,
            timeline,
            { expires: Date.now() + 10 * 1000 }
        );
    }

    async cacheMentions(mentions: Tweet[]) {
        await this.runtime.cacheManager.set(
            `twitter/${this.profile.username}/mentions`,
            mentions,
            { expires: Date.now() + 10 * 1000 }
        );
    }

    async getCachedCookies(username: string) {
        return await this.runtime.cacheManager.get<any[]>(
            `twitter/${username}/cookies`
        );
    }

    async cacheCookies(username: string, cookies: any[]) {
        await this.runtime.cacheManager.set(
            `twitter/${username}/cookies`,
            cookies
        );
    }

    async getCachedProfile(username: string) {
        return await this.runtime.cacheManager.get<TwitterProfile>(
            `twitter/${username}/profile`
        );
    }

    async cacheProfile(profile: TwitterProfile) {
        await this.runtime.cacheManager.set(
            `twitter/${profile.username}/profile`,
            profile
        );
    }

    async fetchProfile(username: string): Promise<TwitterProfile> {
        const cached = await this.getCachedProfile(username);

        if (cached) return cached;

        try {
            const profile = await this.requestQueue.add(async () => {
                const profile = await this.twitterClient.getProfile(username);
                // console.log({ profile });
                return {
                    id: profile.userId,
                    username,
                    screenName: profile.name || this.runtime.character.name,
                    bio:
                        profile.biography ||
                        typeof this.runtime.character.bio === "string"
                            ? (this.runtime.character.bio as string)
                            : this.runtime.character.bio.length > 0
                              ? this.runtime.character.bio[0]
                              : "",
                    nicknames:
                        this.runtime.character.twitterProfile?.nicknames || [],
                } satisfies TwitterProfile;
            });

            this.cacheProfile(profile);

            return profile;
        } catch (error) {
            console.error("Error fetching Twitter profile:", error);

            return undefined;
        }
    }
}
