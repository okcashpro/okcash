import { SearchMode, Tweet } from "agent-twitter-client";
import { UUID } from "crypto";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { ClientBase } from "./base.ts";
import { log_to_file } from "../../core/logger.ts";
import { composeContext } from "../../core/context.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { Message, State, Content } from "../../core/types.ts";

export const messageHandlerTemplate = `{{relevantFacts}}
{{recentFacts}}

# Task: Generate a post for the character {{agentName}}.
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{characterPostExamples}}

{{postDirections}}

{{recentPosts}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}):
{{tweetContext}}

Response format should be formatted in a JSON block like this:
\`\`\`json\n{ \"user\": \"{{agentName}}\", \"content\": string, \"action\": string }
\`\`\`

{{recentPosts}}`;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentPosts}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversation.`;

export class TwitterInteractionClient extends ClientBase {
  onReady() {
    console.log("Checking Twitter interactions");
    const handleTwitterInteractionsLoop = () => {
      this.handleTwitterInteractions();
      setTimeout(
        handleTwitterInteractionsLoop,
        Math.floor(Math.random() * 300000) + 600000,
      ); // Random interval between 10-15 minutes
    };
    handleTwitterInteractionsLoop();
  }

  constructor(runtime: AgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
      callback: (self) => self.onReady(),
    });
  }

  private async handleTwitterInteractions() {
    console.log("Checking Twitter interactions");
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error("Twitter username not set in settings");
        return;
      }

      // Check for mentions
      const mentions = this.twitterClient.searchTweets(
        `@${botTwitterUsername}`,
        20,
        SearchMode.Latest,
      );
      for await (const tweet of mentions) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        await this.handleTweet(tweet);
      }

      // Check for replies to the bot's tweets
      const botTweets = this.twitterClient.getTweets(botTwitterUsername, 20);
      for await (const tweet of botTweets) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        const replies = this.twitterClient.searchTweets(
          `to:${botTwitterUsername}`,
          20,
          SearchMode.Latest,
        );
        for await (const reply of replies) {
          if (reply.inReplyToStatusId === tweet.id) {
            await this.handleTweet(reply);
          }
        }
      }

      // Update the last checked tweet ID
      const latestTweet =
        await this.twitterClient.getLatestTweet(botTwitterUsername);
      if (latestTweet) {
        this.lastCheckedTweetId = latestTweet.id;
      }
      console.log(
        "Finished checking Twitter interactions, latest tweet is:",
        latestTweet,
      );
    } catch (error) {
      console.error("Error handling Twitter interactions:", error);
    }
  }

  private async handleTweet(tweet: Tweet) {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    if (tweet.username === botTwitterUsername) {
      // Skip processing if the tweet is from the bot itself
      return;
    }
    const twitterUserId = getUuid(tweet.userId as string) as UUID;
    const twitterRoomId = getUuid("twitter") as UUID;

    await Promise.all([
      this.runtime.ensureUserExists(twitterUserId, tweet.username),
      this.runtime.ensureRoomExists(twitterRoomId),
    ]);

    await this.runtime.ensureParticipantInRoom(twitterUserId, twitterRoomId);

    const message: Message = {
      content: { content: tweet.text },
      user_id: twitterUserId,
      room_id: twitterRoomId,
    };

    const shouldIgnore = false;
    let shouldRespond = true;

    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }

    let tweetBackground = "";
    if (tweet.isRetweet) {
      const originalTweet = await this.twitterClient.getTweet(tweet.id);
      tweetBackground = `Retweeting @${originalTweet.username}: ${originalTweet.text}`;
    }

    const imageDescriptions = [];
    if (tweet.photos && tweet.photos.length > 0) {
      for (const photo of tweet.photos) {
        const description = await this.describeImage(photo.url);
        imageDescriptions.push(description);
      }
    }

    // Fetch replies and retweets
    const replies = await this.getReplies(tweet.id);
    const replyContext = replies
      .filter((reply) => reply.username !== botTwitterUsername)
      .map((reply) => `@${reply.username}: ${reply.text}`)
      .join("\n");

    console.log("****** imageDescriptions");
    console.log(imageDescriptions);

    let state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
      twitterUserName: botTwitterUsername,
      tweetContext: `Post Background:
${tweetBackground}

Original Post:
By @${tweet.username}
${tweet.text}${tweet.replies > 0 && `\nReplies to original post:\n${replyContext}`}\n${`Original post text: ${tweet.text}`}}
${tweet.urls.length > 0 ? `URLs: ${tweet.urls.join(", ")}\n` : ""}${imageDescriptions.length > 0 ? `\nImages in Post (Described): ${imageDescriptions.join(", ")}\n` : ""}
`,
    });

    await this.saveRequestMessage(message, state as State);

    if (shouldIgnore) {
      console.log("shouldIgnore", shouldIgnore);
      return { content: "", action: "IGNORE" };
    }

    const nickname = settings.TWITTER_USERNAME;

    state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
      twitterUserName: nickname,
    });

    if (!shouldRespond) {
      const shouldRespondContext = composeContext({
        state,
        template: shouldRespondTemplate,
      });

      const response = await this.runtime.completion({
        context: shouldRespondContext,
        stop: [],
        model: this.runtime.model,
      });

      console.log("*** response from ", nickname, ":", response);

      if (response.toLowerCase().includes("respond")) {
        shouldRespond = true;
      } else if (response.toLowerCase().includes("ignore")) {
        shouldRespond = false;
      } else if (response.toLowerCase().includes("stop")) {
        shouldRespond = false;
      } else {
        console.error("Invalid response:", response);
        shouldRespond = false;
      }
    }

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { content: "", action: "IGNORE" };
    }

    if (!nickname) {
      console.log("No nickname found for bot");
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${botTwitterUsername}_${datestr}_interactions_context`,
      context,
    );

    let responseContent: Content | null = null;
    const { user_id, room_id } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      const response = await this.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
        model: this.runtime.model,
      });
      log_to_file(
        `${botTwitterUsername}_${datestr}_interactions_response_${3 - triesLeft}`,
        response,
      );

      const values = {
        body: response,
        user_id: user_id,
        room_id,
        type: "response",
      };

      // TODO Replace with runtime.log function
      // adapter.db
      //   .prepare(
      //     "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)",
      //   )
      //   .run([values.body, values.user_id, values.room_id, values.type]);

      const parsedResponse = parseJSONObjectFromText(
        response,
      ) as unknown as Content;
      console.log("parsedResponse", parsedResponse);
      if (
        !(parsedResponse?.user as string)?.includes(
          (state as State).senderName as string,
        )
      ) {
        if (!parsedResponse) {
          continue;
        }
        responseContent = {
          content: parsedResponse.content,
          action: parsedResponse.action,
        };
        break;
      }
    }

    if (!responseContent) {
      responseContent = {
        content: "",
        action: "IGNORE",
      };
    }

    await this.saveResponseMessage(message, state, responseContent);
    this.runtime.processActions(message, responseContent, state);

    const response = responseContent;

    if (response.content) {
      console.log(
        `Bot would respond to tweet ${tweet.id} with: ${response.content}`,
      );
      try {
        if (!this.dryRun) {
          await this.twitterClient.sendTweet(response.content, tweet.id);
        } else {
          console.log("Dry run, not sending tweet:", response.content);
        }
        console.log(`Successfully responded to tweet ${tweet.id}`);
        const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.content}`;
        const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
        fs.writeFileSync(debugFileName, responseInfo);
      } catch (error) {
        console.error(`Error sending response tweet: ${error}`);
      }
    }
  }
}
