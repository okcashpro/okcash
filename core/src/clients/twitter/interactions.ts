import { SearchMode, Tweet } from "agent-twitter-client";
import fs from "fs";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import {
  messageCompletionFooter,
  shouldRespondFooter,
} from "../../core/parsing.ts";
import {
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
} from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { ClientBase } from "./base.ts";
import { buildConversationThread, sendTweetChunks, wait } from "./utils.ts";
import { generateMessageResponse, generateShouldRespond } from "../../core/generation.ts";

export const messageHandlerTemplate =
  `{{relevantFacts}}
{{recentFacts}}

{{timeline}}

{{providers}}

# Task: Generate a post for the character {{agentName}}.
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}):
{{currentPost}}

` + messageCompletionFooter;

export const shouldRespondTemplate =
  `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;

export class TwitterInteractionClient extends ClientBase {
  onReady() {
    const handleTwitterInteractionsLoop = () => {
      this.handleTwitterInteractions();
      setTimeout(
        handleTwitterInteractionsLoop,
        (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000,
      ); // Random interval between 2-5 minutes
    };
    handleTwitterInteractionsLoop();
  }

  constructor(runtime: IAgentRuntime) {
    super({
      runtime,
    });
  }

  async handleTwitterInteractions() {
    console.log("Checking Twitter interactions");
    try {
      // Check for mentions
      const tweetCandidates = (
        await this.fetchSearchTweets(
          `@${this.runtime.getSetting("TWITTER_USERNAME")}`,
          20,
          SearchMode.Latest,
        )
      ).tweets;

      // de-duplicate tweetCandidates with a set
      const uniqueTweetCandidates = [...new Set(tweetCandidates)];

      // Sort tweet candidates by ID in ascending order
      uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== this.twitterUserId);

      // for each tweet candidate, handle the tweet
      for (const tweet of uniqueTweetCandidates) {
        if (
          !this.lastCheckedTweetId ||
          parseInt(tweet.id) > this.lastCheckedTweetId
        ) {
          console.log("Processing tweet", tweet.id);
          const conversationId = tweet.conversationId;

          const roomId = stringToUuid(conversationId);
          await this.runtime.ensureRoomExists(roomId);

          const userIdUUID = stringToUuid(tweet.userId as string);
          const agentId = this.runtime.agentId;

          await Promise.all([
            this.runtime.ensureUserExists(
              agentId,
              this.runtime.getSetting("TWITTER_USERNAME"),
              this.runtime.character.name,
              "twitter",
            ),
            this.runtime.ensureUserExists(
              userIdUUID,
              tweet.username,
              tweet.name,
              "twitter",
            ),
          ]);

          await Promise.all([
            this.runtime.ensureParticipantInRoom(userIdUUID, roomId),
            this.runtime.ensureParticipantInRoom(agentId, roomId),
          ]);

          await buildConversationThread(tweet, this);

          const message = {
            content: { text: tweet.text },
            userId: userIdUUID,
            roomId,
          };

          await this.handleTweet({
            tweet,
            message,
          });

          // Update the last checked tweet ID after processing each tweet
          this.lastCheckedTweetId = parseInt(tweet.id);

          try {
            fs.writeFileSync(
              this.tweetCacheFilePath,
              this.lastCheckedTweetId.toString(),
              "utf-8",
            );
          } catch (error) {
            console.error(
              "Error saving latest checked tweet ID to file:",
              error,
            );
          }
        }
      }

      // Save the latest checked tweet ID to the file
      try {
        fs.writeFileSync(
          this.tweetCacheFilePath,
          this.lastCheckedTweetId.toString(),
          "utf-8",
        );
      } catch (error) {
        console.error("Error saving latest checked tweet ID to file:", error);
      }

      console.log("Finished checking Twitter interactions");
    } catch (error) {
      console.error("Error handling Twitter interactions:", error);
    }
  }

  private async handleTweet({
    tweet,
    message,
  }: {
    tweet: Tweet;
    message: Memory;
  }) {
    if (tweet.username === this.runtime.getSetting("TWITTER_USERNAME")) {
      console.log("skipping tweet from bot itself", tweet.id);
      // Skip processing if the tweet is from the bot itself
      return;
    }

    if (!message.content.text) {
      console.log("skipping tweet with no text", tweet.id);
      return { text: "", action: "IGNORE" };
    }
    console.log("handling tweet", tweet.id);
    const formatTweet = (tweet: Tweet) => {
      return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
    };
    const currentPost = formatTweet(tweet);

    let homeTimeline = [];
    // read the file if it exists
    if (fs.existsSync("tweetcache/home_timeline.json")) {
      homeTimeline = JSON.parse(
        fs.readFileSync("tweetcache/home_timeline.json", "utf-8"),
      );
    } else {
      homeTimeline = await this.fetchHomeTimeline(50);
      fs.writeFileSync(
        "tweetcache/home_timeline.json",
        JSON.stringify(homeTimeline, null, 2),
      );
    }

    const formattedHomeTimeline =
      `# ${this.runtime.character.name}'s Home Timeline\n\n` +
      homeTimeline
        .map((tweet) => {
          return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
        })
        .join("\n");

    let state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
      currentPost,
      timeline: formattedHomeTimeline,
    });

    // check if the tweet exists, save if it doesn't
    const tweetId = stringToUuid(tweet.id);
    const tweetExists =
      await this.runtime.messageManager.getMemoryById(tweetId);

    if (!tweetExists) {
      console.log("tweet does not exist, saving");
      const userIdUUID = stringToUuid(tweet.userId as string);
      const roomId = stringToUuid(tweet.conversationId);

      const message = {
        id: tweetId,
        content: {
          text: tweet.text,
          url: tweet.permanentUrl,
          inReplyTo: tweet.inReplyToStatusId
            ? stringToUuid(tweet.inReplyToStatusId)
            : undefined,
        },
        userId: userIdUUID,
        roomId,
        createdAt: tweet.timestamp * 1000,
      };
      this.saveRequestMessage(message, state);
    }

    console.log("composeState done");

    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    const shouldRespond = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass.SMALL,
    });

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { text: "", action: "IGNORE" };
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    const datestr = new Date().toUTCString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_interactions_context`,
      context,
    );

    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: "slow"
    });

    console.log("response", response);

    console.log("tweet is", tweet);

    const stringId = stringToUuid(tweet.id);

    console.log("stringId is", stringId, "while tweet.id is", tweet.id);

    response.inReplyTo = stringId;

    console.log("response is", response);

    log_to_file(
      `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_interactions_response`,
      JSON.stringify(response),
    );

    if (response.text) {
      try {
        if (!this.dryRun) {
          const callback: HandlerCallback = async (response: Content) => {
            const memories = await sendTweetChunks(
              this,
              response,
              message.roomId,
              this.runtime.getSetting("TWITTER_USERNAME"),
              tweet.id,
            );
            return memories;
          };

          const responseMessages = await callback(response);

          state = (await this.runtime.updateRecentMessageState(state)) as State;

          for (const responseMessage of responseMessages) {
            await this.runtime.messageManager.createMemory(responseMessage);
          }

          await this.runtime.evaluate(message, state);

          await this.runtime.processActions(message, responseMessages, state);
        } else {
          console.log("Dry run, not sending tweet:", response.text);
        }
        const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;
        // f tweets folder dont exist, create
        if (!fs.existsSync("tweets")) {
          fs.mkdirSync("tweets");
        }
        const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
        fs.writeFileSync(debugFileName, responseInfo);
        await wait();
      } catch (error) {
        console.error(`Error sending response tweet: ${error}`);
      }
    }
  }
}
