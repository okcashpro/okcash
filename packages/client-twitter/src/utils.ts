import { Tweet } from "agent-twitter-client";
import { embeddingZeroVector } from "@ai16z/eliza/src/memory.ts";
import { Content, Memory, UUID } from "@ai16z/eliza/src/types.ts";
import { stringToUuid } from "@ai16z/eliza/src/uuid.ts";
import { ClientBase } from "./base.ts";
import { elizaLogger } from "@ai16z/eliza/src/logger.ts";

const MAX_TWEET_LENGTH = 240;

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

export const isValidTweet = (tweet: Tweet): boolean => {
    // Filter out tweets with too many hashtags, @s, or $ signs, probably spam or garbage
    const hashtagCount = (tweet.text?.match(/#/g) || []).length;
    const atCount = (tweet.text?.match(/@/g) || []).length;
    const dollarSignCount = tweet.text?.match(/\$/g) || [];
    const totalCount = hashtagCount + atCount + dollarSignCount.length;

    return (
        hashtagCount <= 1 &&
        atCount <= 2 &&
        dollarSignCount.length <= 1 &&
        totalCount <= 3
    );
};

export async function buildConversationThread(
    tweet: Tweet,
    client: ClientBase
): Promise<void> {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentTweet: Tweet) {
        if (!currentTweet) {
            elizaLogger.log("No current tweet found");
            return;
        }
        // check if the current tweet has already been saved
        const memory = await client.runtime.messageManager.getMemoryById(
            stringToUuid(currentTweet.id + "-" + client.runtime.agentId)
        );
        if (!memory) {
            elizaLogger.log("Creating memory for tweet", currentTweet.id);
            const roomId = stringToUuid(
                currentTweet.conversationId + "-" + client.runtime.agentId
            );
            const userId = stringToUuid(currentTweet.userId);

            await client.runtime.ensureConnection(
                userId,
                roomId,
                currentTweet.username,
                currentTweet.name,
                "twitter"
            );

            client.runtime.messageManager.createMemory({
                id: stringToUuid(
                    currentTweet.id + "-" + client.runtime.agentId
                ),
                agentId: client.runtime.agentId,
                content: {
                    text: currentTweet.text,
                    source: "twitter",
                    url: currentTweet.permanentUrl,
                    inReplyTo: currentTweet.inReplyToStatusId
                        ? stringToUuid(
                              currentTweet.inReplyToStatusId +
                                  "-" +
                                  client.runtime.agentId
                          )
                        : undefined,
                },
                createdAt: currentTweet.timestamp * 1000,
                roomId,
                userId:
                    currentTweet.userId === client.twitterUserId
                        ? client.runtime.agentId
                        : stringToUuid(currentTweet.userId),
                embedding: embeddingZeroVector,
            });
        }
        if (visited.has(currentTweet.id)) {
            return;
        }
        visited.add(currentTweet.id);

        thread.unshift(currentTweet);

        if (currentTweet.inReplyToStatus) {
            await processThread(currentTweet.inReplyToStatus);
        }
    }

    await processThread(tweet);
}

export async function sendTweetChunks(
    client: ClientBase,
    content: Content,
    roomId: UUID,
    twitterUsername: string,
    inReplyTo: string
): Promise<Memory[]> {
    const tweetChunks = splitTweetContent(content.text);
    const sentTweets: Tweet[] = [];

    for (const chunk of tweetChunks) {
        const result = await client.requestQueue.add(
            async () =>
                await client.twitterClient.sendTweet(
                    chunk.replaceAll(/\\n/g, "\n").trim(),
                    inReplyTo
                )
        );
        // console.log("send tweet result:\n", result);
        const body = await result.json();
        console.log("send tweet body:\n", body.data.create_tweet.tweet_results);
        const tweetResult = body.data.create_tweet.tweet_results.result;

        const finalTweet = {
            id: tweetResult.rest_id,
            text: tweetResult.legacy.full_text,
            conversationId: tweetResult.legacy.conversation_id_str,
            createdAt: tweetResult.legacy.created_at,
            userId: tweetResult.legacy.user_id_str,
            inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
            permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
            hashtags: [],
            mentions: [],
            photos: [],
            thread: [],
            urls: [],
            videos: [],
        } as Tweet;

        sentTweets.push(finalTweet);
    }

    const memories: Memory[] = sentTweets.map((tweet) => ({
        id: stringToUuid(tweet.id + "-" + client.runtime.agentId),
        agentId: client.runtime.agentId,
        userId: client.runtime.agentId,
        content: {
            text: tweet.text,
            source: "twitter",
            url: tweet.permanentUrl,
            inReplyTo: tweet.inReplyToStatusId
                ? stringToUuid(
                      tweet.inReplyToStatusId + "-" + client.runtime.agentId
                  )
                : undefined,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: tweet.timestamp * 1000,
    }));

    return memories;
}

export async function sendTweet(
    client: ClientBase,
    content: Content,
    roomId: UUID,
    twitterUsername: string,
    inReplyTo: string
): Promise<Memory[]> {
    const chunk = truncateTweetContent(content.text);
    const sentTweets: Tweet[] = [];

    const result = await client.requestQueue.add(
        async () =>
            await client.twitterClient.sendTweet(
                chunk.replaceAll(/\\n/g, "\n").trim(),
                inReplyTo
            )
    );
    // console.log("send tweet result:\n", result);
    const body = await result.json();
    console.log("send tweet body:\n", body.data.create_tweet.tweet_results);
    const tweetResult = body.data.create_tweet.tweet_results.result;

    const finalTweet = {
        id: tweetResult.rest_id,
        text: tweetResult.legacy.full_text,
        conversationId: tweetResult.legacy.conversation_id_str,
        createdAt: tweetResult.legacy.created_at,
        userId: tweetResult.legacy.user_id_str,
        inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
        permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
        hashtags: [],
        mentions: [],
        photos: [],
        thread: [],
        urls: [],
        videos: [],
    } as Tweet;

    sentTweets.push(finalTweet);

    const memories: Memory[] = sentTweets.map((tweet) => ({
        id: stringToUuid(tweet.id + "-" + client.runtime.agentId),
        agentId: client.runtime.agentId,
        userId: client.runtime.agentId,
        content: {
            text: tweet.text,
            source: "twitter",
            url: tweet.permanentUrl,
            inReplyTo: tweet.inReplyToStatusId
                ? stringToUuid(
                      tweet.inReplyToStatusId + "-" + client.runtime.agentId
                  )
                : undefined,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: tweet.timestamp * 1000,
    }));

    return memories;
}

function splitTweetContent(content: string): string[] {
    const tweetChunks: string[] = [];
    let currentChunk = "";

    const words = content.split(" ");
    for (const word of words) {
        if (currentChunk.length + word.length + 1 <= MAX_TWEET_LENGTH) {
            currentChunk += (currentChunk ? " " : "") + word;
        } else {
            tweetChunks.push(currentChunk);
            currentChunk = word;
        }
    }

    if (currentChunk) {
        tweetChunks.push(currentChunk);
    }

    return tweetChunks;
}

export function truncateTweetContent(content: string): string {
    // if its 240, delete the last line
    if (content.length === MAX_TWEET_LENGTH) {
        return content.slice(0, content.lastIndexOf("\n"));
    }

    // if its still bigger than 240, delete everything after the last period
    if (content.length > MAX_TWEET_LENGTH) {
        return content.slice(0, content.lastIndexOf("."));
    }

    // while its STILL bigger than 240, find the second to last exclamation point or period and delete everything after it
    let iterations = 0;
    while (content.length > MAX_TWEET_LENGTH && iterations < 10) {
        iterations++;
        // second to last index of period or exclamation point
        const secondToLastIndexOfPeriod = content.lastIndexOf(
            ".",
            content.length - 2
        );
        const secondToLastIndexOfExclamation = content.lastIndexOf(
            "!",
            content.length - 2
        );
        const secondToLastIndex = Math.max(
            secondToLastIndexOfPeriod,
            secondToLastIndexOfExclamation
        );
        content = content.slice(0, secondToLastIndex);
    }

    return content;
}
