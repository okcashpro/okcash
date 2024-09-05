import { SearchMode } from "agent-twitter-client";
import fs from "fs";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { messageCompletionFooter } from "../../core/parsing.ts";
import { Content, HandlerCallback, State } from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { ClientBase } from "./base.ts";
import {
  buildConversationThread,
  getRecentConversations,
  searchRecentPosts,
  sendTweetChunks,
  wait,
} from "./utils.ts";

const messageHandlerTemplate =
  `{{relevantFacts}}
{{recentFacts}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

Recent conversations:
{{recentConversations}}

Recent tweets which {{agentName}} may or may not find interesting:
{{recentSearchResults}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{postDirections}}
Respond directly to the above post in an {{adjective}} way, as {{agentName}}

{{recentPosts}}

# Task: Respond to the following post in the style and perspective of {{agentName}} (aka @{{twitterUserName}}).
{{currentPost}}

Your response should not contain any questions. Brief, concise statements only.

` + messageCompletionFooter;

export class TwitterSearchClient extends ClientBase {
  private respondedTweets: Set<string> = new Set();

  constructor(runtime: AgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
    });
  }

  async onReady() {
    this.engageWithSearchTermsLoop();
  }

  private engageWithSearchTermsLoop() {
    this.engageWithSearchTerms();
    setTimeout(
      () => this.engageWithSearchTermsLoop(),
      (Math.floor(Math.random() * (60 - 45 + 1)) + 45) * 60 * 1000,
    );
  }

  private async engageWithSearchTerms() {
    console.log("Engaging with search terms");
    try {
      const searchTerm = [...this.runtime.character.topics][
        Math.floor(Math.random() * this.runtime.character.topics.length)
      ];

      if (!fs.existsSync("tweets")) {
        fs.mkdirSync("tweets");
      }

      const tweetsArray = await this.requestQueue.add(
        async () =>
          await this.fetchSearchTweets(searchTerm, 50, SearchMode.Top),
      );

      const recentTweets = await this.requestQueue.add(
        async () =>
          await this.fetchSearchTweets(searchTerm, 50, SearchMode.Latest),
      );

      const allTweets = [...tweetsArray.tweets, ...recentTweets.tweets];

      const uniqueTweets = allTweets.filter(
        (tweet, index, self) =>
          index === self.findIndex((t) => t.id === tweet.id),
      );

      // randomly slice .tweets down to 20
      tweetsArray.tweets = uniqueTweets
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

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
      const botTweet = thread.find(
        (t) => t.username === settings.TWITTER_USERNAME,
      );
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
        (tweet) =>
          tweet.id.toString().includes(tweetId) ||
          tweetId.includes(tweet.id.toString()),
      );

      if (!selectedTweet) {
        console.log("No matching tweet found for the selected ID");
        return console.log("Selected tweet ID:", tweetId);
      }

      console.log("Selected tweet to reply to:", selectedTweet);

      if (selectedTweet.username === settings.TWITTER_USERNAME) {
        console.log("Skipping tweet from bot itself");
        return;
      }

      const conversationId = selectedTweet.conversationId;
      const roomId = stringToUuid(conversationId);
      await this.runtime.ensureRoomExists(roomId);

      const userIdUUID = stringToUuid(selectedTweet.userId as string);
      await Promise.all([
        this.runtime.ensureUserExists(
          this.runtime.agentId,
          settings.TWITTER_USERNAME,
          this.runtime.character.name,
          "twitter",
        ),
        this.runtime.ensureUserExists(
          userIdUUID,
          selectedTweet.username,
          selectedTweet.name,
          "twitter",
        ),
      ]);

      await Promise.all([
        this.runtime.ensureParticipantInRoom(userIdUUID, roomId),
        this.runtime.ensureParticipantInRoom(this.runtime.agentId, roomId),
      ]);

      // crawl additional conversation tweets, if there are any
      await buildConversationThread(selectedTweet, this);

      const message = {
        id: stringToUuid(selectedTweet.id),
        content: {
          text: selectedTweet.text,
          url: selectedTweet.permanentUrl,
          inReplyTo: selectedTweet.inReplyToStatusId
            ? stringToUuid(selectedTweet.inReplyToStatusId)
            : undefined,
        },
        userId: userIdUUID,
        roomId,
        createdAt: new Date(selectedTweet.timestamp * 1000),
      };

      if (!message.content.text) {
        return { text: "", action: "IGNORE" };
      }

      // Fetch replies and retweets
      const replies = selectedTweet.thread;
      const replyContext = replies
        .filter((reply) => reply.username !== settings.TWITTER_USERNAME)
        .map((reply) => `@${reply.username}: ${reply.text}`)
        .join("\n");

      let tweetBackground = "";
      if (selectedTweet.isRetweet) {
        const originalTweet = await this.requestQueue.add(() =>
          this.twitterClient.getTweet(selectedTweet.id),
        );
        tweetBackground = `Retweeting @${originalTweet.username}: ${originalTweet.text}`;
      }

      // Generate image descriptions using GPT-4 vision API
      const imageDescriptions = [];
      for (const photo of selectedTweet.photos) {
        const description =
          await this.runtime.imageDescriptionService.describeImage(photo.url);
        imageDescriptions.push(description);
      }

      await wait();
      const recentConversations = await getRecentConversations(
        this.runtime,
        this,
        settings.TWITTER_USERNAME,
      );
      await wait();
      const recentSearchResults = await searchRecentPosts(
        this.runtime,
        this,
        searchTerm,
      );

      let state = await this.runtime.composeState(message, {
        twitterClient: this.twitterClient,
        twitterUserName: settings.TWITTER_USERNAME,
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
        state,
        template: messageHandlerTemplate,
      });

      // log context to file
      log_to_file(
        `${settings.TWITTER_USERNAME}_${datestr}_search_context`,
        context,
      );

      const responseContent = await this.runtime.messageCompletion({
        context,
        stop: [],
        temperature: this.temperature,
        model: this.runtime.model,
      });

      responseContent.inReplyTo = message.id;

      log_to_file(
        `${settings.TWITTER_USERNAME}_${datestr}_search_response`,
        JSON.stringify(responseContent),
      );

      const response = responseContent;

      if (!response.text) {
        console.log("Returning: No response text found");
        return;
      }

      console.log(
        `Bot would respond to tweet ${selectedTweet.id} with: ${response.text}`,
      );
      try {
        if (!this.dryRun) {
          const callback: HandlerCallback = async (response: Content) => {
            const memories = await sendTweetChunks(
              this,
              response,
              message.roomId,
              settings.TWITTER_USERNAME,
              tweetId,
            );
            return memories;
          };

          const responseMessages = await callback(responseContent);

          state = await this.runtime.updateRecentMessageState(state);

          for (const responseMessage of responseMessages) {
            await this.runtime.messageManager.createMemory(
              responseMessage,
              false,
            );
          }

          state = await this.runtime.updateRecentMessageState(state);

          await this.runtime.evaluate(message, state);

          await this.runtime.processActions(
            message,
            responseMessages,
            state,
            callback,
          );
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
    } catch (error) {
      console.error("Error engaging with search terms:", error);
    }
  }
}
