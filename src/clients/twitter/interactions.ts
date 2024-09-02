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

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

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
        Math.floor(Math.random() * 10000) + 10000,
      ); // Random interval between 10-15 minutes
    };
    handleTwitterInteractionsLoop();
  }

  private tweetCacheFilePath = 'tweetcache/latest_checked_tweet_id.txt';

  constructor(runtime: AgentRuntime) {
    super({
      runtime,
      callback: (self) => self.onReady(),
    });
  
    try {
      if (fs.existsSync(this.tweetCacheFilePath)) {
        const data = fs.readFileSync(this.tweetCacheFilePath, 'utf-8');
        this.lastCheckedTweetId = data.trim();
        console.log('Loaded lastCheckedTweetId:', this.lastCheckedTweetId);
      } else {
        console.warn('Tweet cache file not found.');
      }
    } catch (error) {
      console.error('Error loading latest checked tweet ID from file:', error);
    }
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
        3,
        SearchMode.Latest,
      );
      const tweetCandidates: Tweet[] = [];
      for await (const tweet of mentions) {
        tweetCandidates.push(tweet);
      }
  
      // Check for replies to the bot's tweets
      const botTweets = this.twitterClient.getTweetsAndReplies(
        botTwitterUsername,
        3,
      );
      for await (const tweet of botTweets) {
        tweetCandidates.push(tweet);
      }
  
      // de-duplicate tweetCandidates with a set
      const uniqueTweetCandidates = [...new Set(tweetCandidates)];
  
      // Sort tweet candidates by ID in ascending order
      uniqueTweetCandidates.sort((a, b) => a.id.localeCompare(b.id));
  
      // for each tweet candidate, handle the tweet
      for (const tweet of uniqueTweetCandidates) {
        console.log("this.lastCheckedTweetId", this.lastCheckedTweetId);
        console.log("tweet.id", tweet.id);
        if (!this.lastCheckedTweetId || tweet.id > this.lastCheckedTweetId) {
          console.log("handling tweet", tweet.id);
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
  
          // Update the last checked tweet ID after processing each tweet
          this.lastCheckedTweetId = tweet.id;
console.log('Updated lastCheckedTweetId:', this.lastCheckedTweetId);

try {
  fs.writeFileSync(this.tweetCacheFilePath, this.lastCheckedTweetId.toString(), 'utf-8');
  console.log('Saved lastCheckedTweetId:', this.lastCheckedTweetId);

          } catch (error) {
            console.error('Error saving latest checked tweet ID to file:', error);
          }
        }
      }
  
      // Save the latest checked tweet ID to the file
      try {
        fs.writeFileSync(this.tweetCacheFilePath, this.lastCheckedTweetId.toString(), 'utf-8');
      } catch (error) {
        console.error('Error saving latest checked tweet ID to file:', error);
      }
  
      console.log("Finished checking Twitter interactions");
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
    console.log("handleTweet", tweet.id);
    const botTwitterUsername = settings.TWITTER_USERNAME;
    if (tweet.username === botTwitterUsername) {
      console.log("skipping tweet from bot itself", tweet.id);
      // Skip processing if the tweet is from the bot itself
      return;
    }

    if (!message.content.text) {
      console.log("skipping tweet with no text", tweet.id);
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

    console.log("currentPost", currentPost);


    console.log("composeState");

    let state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterUserName: botTwitterUsername,
      recentConversations: recentConversationsText,
      currentPost,
    });

    console.log("composeState done");

    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    console.log("shouldRespondContext");

    const shouldRespond = await this.runtime.shouldRespondCompletion({
      context: shouldRespondContext,
      stop: [],
      model: this.runtime.model,
    });

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { text: "", action: "IGNORE" };
    }

    console.log("composeContext");

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

    console.log("messageCompletion");

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

    console.log("**** messageCompletion response", response);

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