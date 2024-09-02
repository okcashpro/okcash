import { SearchMode, Tweet } from "agent-twitter-client";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { messageCompletionFooter, shouldRespondFooter } from "../../core/parsing.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { Message, UUID } from "../../core/types.ts";
import { ClientBase } from "./base.ts";
import { buildConversationThread, getRecentConversations, searchRecentPosts, wait } from "./utils.ts";

export const messageHandlerTemplate = `{{relevantFacts}}
{{recentFacts}}

# Task: Generate a post for the character {{agentName}}.
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

*** characterPostExamples
{{characterPostExamples}}

***postDirections
{{postDirections}}

***recentPosts
{{recentPosts}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}):
***currentPost
{{currentPost}}

` + messageCompletionFooter;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{currentPost}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;

export class TwitterInteractionClient extends ClientBase {
  onReady() {
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

  async handleTwitterInteractions() {
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
      const tweetCandidates: Tweet[] = [];
      for await (const tweet of mentions) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        tweetCandidates.push(tweet);
      }

      // Check for replies to the bot's tweets
      const botTweets = this.twitterClient.getTweetsAndReplies(
        botTwitterUsername,
        20,
      );
      for await (const tweet of botTweets) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        tweetCandidates.push(tweet);
      }

      // de-duplicate tweetCandidates with a set
      const uniqueTweetCandidates = [...new Set(tweetCandidates)];

      // for each tweet candidate, handle the tweet
      for (const tweet of uniqueTweetCandidates) {
        const conversationId = tweet.conversationId;
        const tweetId = tweet.id;

        const room_id = getUuid(conversationId) as UUID;
        await this.runtime.ensureRoomExists(room_id);

        const userIdUUID = getUuid(tweet.userId as string) as UUID;
        const agentId = this.runtime.agentId;

        await Promise.all([
          this.runtime.ensureUserExists(agentId, settings.TWITTER_USERNAME, this.runtime.character.name),
          this.runtime.ensureUserExists(userIdUUID, tweet.username, tweet.name),
        ]);

        await Promise.all([
          this.runtime.ensureParticipantInRoom(userIdUUID, room_id),
          this.runtime.ensureParticipantInRoom(agentId, room_id),
        ]);

        const conversationThread = await buildConversationThread(tweet, this);

        const message = {
          content: { text: tweet.text },
          user_id: userIdUUID,
          room_id,
        };

        await this.handleTweet({
          tweet,
          message,
          conversationThread,
        });
      }

      // Update the last checked tweet ID
      const latestTweet = await this.twitterClient.getLatestTweet(botTwitterUsername);
      if (latestTweet) {
        this.lastCheckedTweetId = latestTweet.id;
      }
      console.log("Finished checking Twitter interactions, latest tweet is:", latestTweet);
    } catch (error) {
      console.error("Error handling Twitter interactions:", error);
    }
  }

  private async handleTweet({
    tweet,
    message,
    conversationThread,
  }: {
    tweet: Tweet;
    message: Message;
    conversationThread: string;
  }) {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    if (tweet.username === botTwitterUsername) {
      // Skip processing if the tweet is from the bot itself
      return;
    }

    if (!message.content.text) {
      return { text: "", action: "IGNORE" };
    }

    const formatTweet = (tweet: Tweet) => {
      return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
    };

    // Fetch recent conversations
    const recentConversationsText = await getRecentConversations(
      this.runtime,
      this.twitterClient,
      botTwitterUsername,
    );

    const currentPost = formatTweet(tweet);

    let state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterUserName: botTwitterUsername,
      recentConversations: recentConversationsText,
      currentPost,
    });

    // Fetch recent search results
    const recentSearchResultsText = await searchRecentPosts(
      this.runtime,
      this.twitterClient,
      state.topic,
    );
    state["recentSearchResultsText"] = recentSearchResultsText;
    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    const shouldRespond = await this.runtime.shouldRespondCompletion({
      context: shouldRespondContext,
      stop: [],
      model: this.runtime.model,
    });

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { text: "", action: "IGNORE" };
    }

    const context = composeContext({
      state: {
        ...state,
        tweetContext: `
  Post Background:
  ${conversationThread}
  
  Original Post:
  ${currentPost}
  `,
      },
      template: messageHandlerTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${botTwitterUsername}_${datestr}_interactions_context`,
      context,
    );

    const response = await this.runtime.messageCompletion({
      context,
      stop: [],
      temperature: this.temperature,
      model: this.runtime.model,
    });
    log_to_file(
      `${botTwitterUsername}_${datestr}_interactions_response`,
      JSON.stringify(response),
    );

    await this.saveResponseMessage(message, state, response);
    this.runtime.processActions(message, response, state);

    if (response.text) {
      console.log(
        `Bot would respond to tweet ${tweet.id} with: ${response.text}`,
      );
      try {
        if (!this.dryRun) {
          await this.requestQueue.add(async () => {
            await this.twitterClient.sendTweet(response.text, tweet.id);
          });
        } else {
          console.log("Dry run, not sending tweet:", response.text);
        }
        // we're running this in a loop, so wait a bit
        console.log(`Successfully responded to tweet ${tweet.id}`);
        const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;
        const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
        fs.writeFileSync(debugFileName, responseInfo);
        await wait();
      } catch (error) {
        console.error(`Error sending response tweet: ${error}`);
      }
    }
  }
}