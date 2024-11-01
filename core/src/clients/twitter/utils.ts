import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import { addHeader } from "../../core/context.ts";
import { Content, IAgentRuntime, Memory, UUID } from "../../core/types.ts";
import { ClientBase } from "./base.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { stringToUuid } from "../../core/uuid.ts";

const MAX_TWEET_LENGTH = 280;

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
  client: ClientBase,
): Promise<void> {
  const thread: Tweet[] = [];
  const visited: Set<string> = new Set();

  async function processThread(currentTweet: Tweet) {
    if (!currentTweet) {
      console.log("No current tweet found");
      return;
    }
    // check if the current tweet has already been saved
    const memory = await client.runtime.messageManager.getMemoryById(
      stringToUuid(currentTweet.id),
    );
    if (!memory) {
      console.log("Creating memory for tweet", currentTweet.id);
      const roomId = stringToUuid(currentTweet.conversationId);
      const userId = stringToUuid(currentTweet.userId);
      await client.runtime.ensureRoomExists(roomId);
      await client.runtime.ensureUserExists(
        userId,
        currentTweet.username,
        currentTweet.name,
        "twitter",
      );
      await client.runtime.ensureParticipantInRoom(userId, roomId);
      await client.runtime.ensureParticipantInRoom(
        client.runtime.agentId,
        roomId,
      );
      client.runtime.messageManager.createMemory({
        id: stringToUuid(currentTweet.id),
        content: {
          text: currentTweet.text,
          source: "twitter",
          url: currentTweet.permanentUrl,
          inReplyTo: currentTweet.inReplyToStatusId
            ? stringToUuid(currentTweet.inReplyToStatusId)
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
  inReplyTo: string,
): Promise<Memory[]> {
  const tweetChunks = splitTweetContent(content.text);
  const sentTweets: Tweet[] = [];

  for (const chunk of tweetChunks) {
    const result = await client.requestQueue.add(
      async () => await client.twitterClient.sendTweet(chunk.replaceAll(/\\n/g, "\n").trim(), inReplyTo),
    );
    console.log("send tweet result:\n", result);
    const body = await result.json();
    console.log("send tweet body:\n", body);
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
    id: stringToUuid(tweet.id),
    userId: client.runtime.agentId,
    content: {
      text: tweet.text,
      source: "twitter",
      url: tweet.permanentUrl,
      inReplyTo: tweet.inReplyToStatusId
        ? stringToUuid(tweet.inReplyToStatusId)
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
