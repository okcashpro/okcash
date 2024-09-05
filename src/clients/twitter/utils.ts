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

export const getRecentConversations = async (
  runtime: IAgentRuntime,
  twitterClient: ClientBase,
  botTwitterUsername: string,
) => {
  // Get recent conversations
  const recentConversations = await twitterClient.requestQueue.add(async () =>
    await twitterClient.fetchSearchTweets(
      `@${botTwitterUsername} exclude:retweets`,
      25,
      SearchMode.Latest,
    )
  );

  const recentConversationsArray = [];

  // Format recent conversations
  for (const conversation of recentConversations.tweets) {
    let formattedConversation = `Name: ${conversation.name} (@${conversation.username})\n`;
    formattedConversation += `Time: ${conversation.timeParsed.toLocaleString()}\n`;
    formattedConversation += `Text: ${conversation.text}\n`;

    if (conversation.photos.length > 0) {
      const photoDescriptions = await Promise.all(
        conversation.photos.map(async (photo) => {
          const description =
            await runtime.imageDescriptionService.describeImage(photo.url);
          return `[Photo: ${description.title} - ${description.description}]`;
        }),
      );
      formattedConversation += `Photos: ${photoDescriptions.join(", ")}\n`;
    }

    if (conversation.videos.length > 0) {
      const videoTranscriptions = await Promise.all(
        conversation.videos.map(async (video) => {
          const transcription = await runtime.videoService.processVideo(
            video.url,
          );
          return `[Video Transcription: ${transcription.text}]`;
        }),
      );
      formattedConversation += `Videos: ${videoTranscriptions.join(", ")}\n`;
    }

    formattedConversation += `Replies: ${conversation.replies}, Retweets: ${conversation.retweets}, Likes: ${conversation.likes}, Views: ${conversation.views ?? "Unknown"}\n`;

    recentConversationsArray.push(formattedConversation);
  }

  // Sort recent conversations by timestamp
  recentConversationsArray.sort((a, b) => {
    const timeA = new Date(a.match(/Time: (.*)/)[1]).getTime();
    const timeB = new Date(b.match(/Time: (.*)/)[1]).getTime();
    return timeA - timeB;
  });

  const recentConversationsText = recentConversationsArray.join("\n");

  return addHeader("### Recent Post Interactions", recentConversationsText);
};

export const searchRecentPosts = async (
  runtime: IAgentRuntime,
  client: ClientBase,
  searchTerm: string,
) => {
  const recentSearchResults = [];
  const tweets = await client.requestQueue.add(async () =>
    await client.twitterClient.fetchSearchTweets(
      searchTerm + " exclude:replies exclude:retweets",
      25,
      SearchMode.Latest,
    ),
  );

  // Format search results
  for (const tweet of tweets.tweets.filter((tweet) => isValidTweet(tweet))) {
    let formattedTweet = `Name: ${tweet.name} (@${tweet.username})\n`;
    formattedTweet += `Time: ${tweet.timeParsed.toLocaleString()}\n`;
    formattedTweet += `Text: ${tweet.text}\n---\n`;

    if (tweet.photos.length > 0) {
      const photoDescriptions = await Promise.all(
        tweet.photos.map(async (photo) => {
          const description =
            await runtime.imageDescriptionService.describeImage(photo.url);
          return `[Photo: ${description.title} - ${description.description}]`;
        }),
      );
      formattedTweet += `Photos: ${photoDescriptions.join(", ")}\n`;
    }

    if (tweet.videos.length > 0) {
      const videoTranscriptions = await Promise.all(
        tweet.videos.map(async (video) => {
          const transcription = await runtime.videoService.processVideo(
            video.url,
          );
          return `[Video Transcription: ${transcription.text}]`;
        }),
      );
      formattedTweet += `Videos: ${videoTranscriptions.join(", ")}\n`;
    }

    formattedTweet += `Replies: ${tweet.replies}, Retweets: ${tweet.retweets}, Likes: ${tweet.likes}, Views: ${tweet.views ?? "Unknown"}\n`;

    // If tweet is a reply, find the original tweet and include it
    if (tweet.inReplyToStatusId) {
      const originalTweet = tweets.tweets.find(
        (t) => t.id === tweet.inReplyToStatusId,
      );
      if (originalTweet) {
        formattedTweet += `\nIn reply to:\n`;
        formattedTweet += `Name: ${originalTweet.name} (@${originalTweet.username})\n`;
        formattedTweet += `Time: ${originalTweet.timeParsed.toLocaleString()}\n`;
        formattedTweet += `Text: ${originalTweet.text}\n`;
      } else {
        // wait 1.5-3.5 seconds to avoid rate limiting
        const waitTime = Math.floor(Math.random() * 2000) + 1500;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        // now look up the original tweet
        const originalTweet = await client.requestQueue.add(async () =>
          await client.twitterClient.getTweet(
            tweet.inReplyToStatusId,
          ),
        );
        formattedTweet += `\nIn reply to:\n`;
        formattedTweet += `Name: ${originalTweet.name} (@${originalTweet.username})\n`;
        formattedTweet += `Time: ${originalTweet.timeParsed.toLocaleString()}\n`;
        formattedTweet += `Text: ${originalTweet.text}\n`;
      }
    }

    recentSearchResults.push(formattedTweet);
  }

  // Sort search results by timestamp
  recentSearchResults.sort((a, b) => {
    const timeA = new Date(a.match(/Time: (.*)/)[1]).getTime();
    const timeB = new Date(b.match(/Time: (.*)/)[1]).getTime();
    return timeA - timeB;
  });

  const recentSearchResultsText = recentSearchResults.join("\n");
  return addHeader(
    "### Recent Search Results for " + searchTerm,
    recentSearchResultsText,
  );
};

export async function buildConversationThread(
  tweet: Tweet,
  client: ClientBase,
): Promise<void> {
  let thread: Tweet[] = [];
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
        createdAt: new Date(currentTweet.timestamp * 1000),
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
  console.log("Sending tweet chunks", content);
  const tweetChunks = splitTweetContent(content.text);
  console.log("Tweet chunks", tweetChunks);
  const sentTweets: Tweet[] = [];

  for (const chunk of tweetChunks) {
    const success = await client.requestQueue.add(async () =>
      await client.twitterClient.sendTweet(chunk, inReplyTo)
    );
    if (success) {
      const tweet = await client.requestQueue.add(async () => {
        return await client.twitterClient.getLatestTweet(
          twitterUsername,
          false,
        );
      });
      if (tweet) {
        sentTweets.push(tweet);
      } else {
        console.error("Failed to get latest tweet after posting it");
      }
    } else {
      console.error("Failed to send tweet");
    }
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
    createdAt: new Date(tweet.timestamp * 1000),
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
