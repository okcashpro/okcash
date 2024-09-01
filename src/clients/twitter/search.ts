import { SearchMode } from "agent-twitter-client";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { messageCompletionFooter } from "../../core/parsing.ts";
import { Message, State, UUID } from "../../core/types.ts";
import { ClientBase } from "./base.ts";
import {
  buildConversationThread,
  getRecentConversations,
  searchRecentPosts,
  wait
} from "./utils.ts";

const messageHandlerTemplate = `{{relevantFacts}}
{{recentFacts}}

Recent conversations:
{{recentConversations}}

Recent tweets which {{agentName}} may or may not find interesting:
{{recentSearchResults}}

{{topics}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{recentPosts}}

{{postDirections}}
- Respond directly to the above post in an {{adjective}} way, as {{agentName}}

# Task: Respond to the following post in the style and perspective of {{agentName}} (aka @{{twitterUserName}}).
{{tweetContext}}

Your response should not contain any questions. Brief, concise statements only.

` + messageCompletionFooter;

export class TwitterSearchClient extends ClientBase {
  private respondedTweets: Set<string> = new Set();

  constructor(runtime: AgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
      callback: (self) => self.onReady(),
    });
  }

  async onReady() {
    this.engageWithSearchTermsLoop();
  }

  private engageWithSearchTermsLoop() {
    this.engageWithSearchTerms();
    setTimeout(
      () => this.engageWithSearchTermsLoop(),
      Math.floor(Math.random() * 10000) + 60000,
    );
  }

  private async engageWithSearchTerms() {
    console.log("Engaging with search terms");
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error("Twitter username not set in settings");
        return;
      }
  
      const searchTerm = [...this.runtime.character.topics][Math.floor(Math.random() * this.runtime.character.topics.length)];
  
      if (!fs.existsSync("tweets")) {
        fs.mkdirSync("tweets");
      }
  
      const tweetsArray = await this.twitterClient.fetchSearchTweets(searchTerm, 20, SearchMode.Latest);
  
      if (tweetsArray.tweets.length === 0) {
        console.log("No valid tweets found for the search term");
        return;
      }
  
      const prompt = `
  Here are some tweets related to the search term "${searchTerm}":
  
  ${tweetsArray.tweets
    .filter((tweet) => {
      // ignore tweets where any of the thread tweets contain a tweet by the bot
      const thread = tweet.thread;
      const botTweet = thread.find((t) => t.username === botTwitterUsername);
      return !botTweet;
    })
    .map(
      (tweet) => `
    ID: ${tweet.id}
    From: ${tweet.name} (@${tweet.username})
    Text: ${tweet.text}
  `,
    )
    .join("\n")}
  
  Which tweet is the most interesting and relevant for Ruby to reply to? Please provide only the ID of the tweet in your response.
  Notes:
    - Respond to English tweets only
    - Respond to tweets that don't have a lot of hashtags, links, URLs or images
    - Respond to tweets that are not retweets
    - Respond to tweets where there is an easy exchange of ideas to have with the user
    - ONLY respond with the ID of the tweet`;
  
      const datestr = new Date().toISOString().replace(/:/g, "-");
      const logName = `${this.runtime.character.name}_search_${datestr}`;
      log_to_file(logName, prompt);
  
      const mostInterestingTweetResponse = await this.runtime.completion({
        context: prompt,
        stop: [],
        temperature: this.temperature,
        model: this.runtime.model,
      });
  
      const responseLogName = `${this.runtime.character.name}_search_${datestr}_result`;
      log_to_file(responseLogName, mostInterestingTweetResponse);
  
      const tweetId = mostInterestingTweetResponse.trim();
      const selectedTweet = tweetsArray.tweets.find(
        (tweet) => tweet.id.toString().includes(tweetId) || tweetId.includes(tweet.id.toString()),
      );
  
      if (!selectedTweet) {
        console.log("No matching tweet found for the selected ID");
        return console.log("Selected tweet ID:", tweetId);
      }
  
      console.log("Selected tweet to reply to:", selectedTweet);
  
      if (selectedTweet.username === botTwitterUsername) {
        console.log("Skipping tweet from bot itself");
        return;
      }
  
      const conversationId = selectedTweet.conversationId;
      const room_id = getUuid(conversationId) as UUID;
      await this.runtime.ensureRoomExists(room_id);
  
      const userIdUUID = getUuid(selectedTweet.userId as string) as UUID;
      await Promise.all([
        this.runtime.ensureUserExists(this.runtime.agentId, settings.TWITTER_USERNAME, this.runtime.character.name),
        this.runtime.ensureUserExists(userIdUUID, selectedTweet.username, selectedTweet.name),
      ]);
  
      await Promise.all([
        this.runtime.ensureParticipantInRoom(userIdUUID, room_id),
        this.runtime.ensureParticipantInRoom(this.runtime.agentId, room_id),
      ]);
  
      const conversationThread = await buildConversationThread(selectedTweet, this);
  
      const message = {
        content: { text: selectedTweet.text },
        user_id: userIdUUID,
        room_id,
      };
  
      if (!message.content.text) {
        return { text: "", action: "IGNORE" };
      }
  
      // Fetch replies and retweets
      const replies = selectedTweet.thread;
      const replyContext = replies
        .filter((reply) => reply.username !== botTwitterUsername)
        .map((reply) => `@${reply.username}: ${reply.text}`)
        .join("\n");
  
      let tweetBackground = "";
      if (selectedTweet.isRetweet) {
        const originalTweet = await this.requestQueue.add(() => this.twitterClient.getTweet(selectedTweet.id));
        tweetBackground = `Retweeting @${originalTweet.username}: ${originalTweet.text}`;
      }
  
      // Generate image descriptions using GPT-4 vision API
      const imageDescriptions = [];
      for (const photo of selectedTweet.photos) {
        const description = await this.runtime.imageDescriptionService.describeImage(photo.url);
        imageDescriptions.push(description);
      }
  
      await wait();
      const recentConversations = await getRecentConversations(this.runtime, this.twitterClient, botTwitterUsername);
      await wait();
      const recentSearchResults = await searchRecentPosts(this.runtime, this.twitterClient, searchTerm);
  
      const state = await this.runtime.composeState(message, {
        twitterClient: this.twitterClient,
        twitterUserName: botTwitterUsername,
        recentConversations,
        recentSearchResults,
        tweetContext: `
  Post Background:
  ${tweetBackground}
  
  Original Post:
  By @${selectedTweet.username}
  ${selectedTweet.text}${replyContext.length > 0 && `\nReplies to original post:\n${replyContext}`}
  ${`Original post text: ${selectedTweet.text}`}
  ${selectedTweet.urls.length > 0 ? `URLs: ${selectedTweet.urls.join(", ")}\n` : ""}${imageDescriptions.length > 0 ? `\nImages in Post (Described): ${imageDescriptions.join(", ")}\n` : ""}
  `,
      });
  
      await this.saveRequestMessage(message, state as State);
  
      const context = composeContext({
        state: {
          ...state,
          tweetContext: `
  Post Background:
  ${conversationThread}
  
  Original Post:
  ${(state as State).tweetContext}
  `,
        },
        template: messageHandlerTemplate,
      });
    
      // log context to file
      log_to_file(`${botTwitterUsername}_${datestr}_search_context`, context);
  
      const responseContent = await this.runtime.messageCompletion({
        context,
        stop: [],
        temperature: this.temperature,
        model: this.runtime.model,
      });
  
      log_to_file(`${botTwitterUsername}_${datestr}_search_response`, JSON.stringify(responseContent));
  
      await this.saveResponseMessage(message, state, responseContent);
      this.runtime.processActions(message, responseContent, state);
  
      const response = responseContent;
  
      if (response.text) {
        console.log(`Bot would respond to tweet ${selectedTweet.id} with: ${response.text}`);
        try {
          if (!this.dryRun) {
            await this.requestQueue.add(async () => {
              await this.twitterClient.sendTweet(response.text, selectedTweet.id);
            });
          } else {
            console.log("Dry run, not sending post:", response.text);
          }
          console.log(`Successfully responded to tweet ${selectedTweet.id}`);
          this.respondedTweets.add(selectedTweet.id);
          const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${selectedTweet.id} - ${selectedTweet.username}: ${selectedTweet.text}\nAgent's Output:\n${response.text}`;
          const debugFileName = `tweets/tweet_generation_${selectedTweet.id}.txt`;
          console.log(`Writing response tweet info to ${debugFileName}`);
          fs.writeFileSync(debugFileName, responseInfo);
          await wait();
        } catch (error) {
          console.error(`Error sending response post: ${error}`);
        }
      }
    } catch (error) {
      console.error("Error engaging with search terms:", error);
    }
  }
}
