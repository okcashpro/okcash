import { SearchMode } from "agent-twitter-client";
import fs from "fs";
import { addHeader, composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { messageCompletionFooter } from "../../core/parsing.ts";
import {
  Content,
  HandlerCallback,
  IAgentRuntime,
  State,
} from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { ClientBase } from "./base.ts";
import {
  buildConversationThread,
  isValidTweet,
  sendTweetChunks,
  wait,
} from "./utils.ts";

const messageHandlerTemplate =
  `{{relevantFacts}}
{{recentFacts}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

Recent tweets which {{agentName}} may or may not find interesting:
{{recentSearchResults}}

{{timeline}}

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

  constructor(runtime: IAgentRuntime) {
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
      console.log("Fetching search tweets");
      // wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log("searchTerm is", searchTerm);
      const recentTweets = await this.fetchSearchTweets(searchTerm, 20, SearchMode.Latest);
      console.log("Search tweets fetched");

      const homeTimeline = await this.fetchHomeTimeline(50);
      fs.writeFileSync(
        "tweetcache/home_timeline.json",
        JSON.stringify(homeTimeline, null, 2),
      );

      const formattedHomeTimeline =
        `# ${this.runtime.character.name}'s Home Timeline\n\n` +
        homeTimeline
          .map((tweet) => {
            return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
          })
          .join("\n");

      // randomly slice .tweets down to 20
      const slicedTweets = recentTweets.tweets
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      if (slicedTweets.length === 0) {
        console.log("No valid tweets found for the search term");
        return;
      }

      const prompt = `
  Here are some tweets related to the search term "${searchTerm}":
  
  ${[...slicedTweets, ...homeTimeline]
    .filter((tweet) => {
      // ignore tweets where any of the thread tweets contain a tweet by the bot
      const thread = tweet.thread;
      const botTweet = thread.find(
        (t) => t.username === this.runtime.getSetting("TWITTER_USERNAME"),
      );
      return !botTweet;
    })
    .map(
      (tweet) => `
    ID: ${tweet.id}${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}
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

      const datestr = new Date().toUTCString().replace(/:/g, "-");
      const logName = `${this.runtime.character.name}_search_${datestr}`;
      log_to_file(logName, prompt);

      const mostInterestingTweetResponse = await this.runtime.completion({
        context: prompt,
        stop: [],
        temperature: this.temperature,
      });

      const responseLogName = `${this.runtime.character.name}_search_${datestr}_result`;
      log_to_file(responseLogName, mostInterestingTweetResponse);

      const tweetId = mostInterestingTweetResponse.trim();
      const selectedTweet = slicedTweets.find(
        (tweet) =>
          tweet.id.toString().includes(tweetId) ||
          tweetId.includes(tweet.id.toString()),
      );

      if (!selectedTweet) {
        console.log("No matching tweet found for the selected ID");
        return console.log("Selected tweet ID:", tweetId);
      }

      console.log("Selected tweet to reply to:", selectedTweet);

      if (
        selectedTweet.username === this.runtime.getSetting("TWITTER_USERNAME")
      ) {
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
          this.runtime.getSetting("TWITTER_USERNAME"),
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
        // Timestamps are in seconds, but we need them in milliseconds
        createdAt: selectedTweet.timestamp * 1000,
      };

      if (!message.content.text) {
        return { text: "", action: "IGNORE" };
      }

      // Fetch replies and retweets
      const replies = selectedTweet.thread;
      const replyContext = replies
        .filter(
          (reply) =>
            reply.username !== this.runtime.getSetting("TWITTER_USERNAME"),
        )
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

      const searchRecentPosts = async (
        runtime: IAgentRuntime,
        client: ClientBase,
        searchTerm: string,
      ) => {
        const recentSearchResults = [];
        const tweets = await client.requestQueue.add(
          async () =>
            await client.twitterClient.fetchSearchTweets(
              searchTerm + " exclude:replies exclude:retweets",
              25,
              SearchMode.Latest,
            ),
        );

        const sortedTweets = tweets.tweets.sort(
          (a, b) => b.timestamp - a.timestamp,
        );

        // Format search results
        for (const tweet of sortedTweets.filter((tweet) =>
          isValidTweet(tweet),
        )) {
          let formattedTweet = `Name: ${tweet.name} (@${tweet.username})\n`;
          formattedTweet += `Time: ${tweet.timeParsed.toLocaleString()}\n`;
          formattedTweet += `Text: ${tweet.text}\n---\n`;

          if (tweet.photos.length > 0) {
            const photoDescriptions = await Promise.all(
              tweet.photos.map(async (photo) => {
                const description =
                  await runtime.imageDescriptionService.describeImage(
                    photo.url,
                  );
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
              const originalTweet = await client.requestQueue.add(
                async () =>
                  await client.twitterClient.getTweet(tweet.inReplyToStatusId),
              );
              formattedTweet += `\nIn reply to:\n`;
              formattedTweet += `Name: ${originalTweet.name} (@${originalTweet.username})\n`;
              formattedTweet += `Time: ${originalTweet.timeParsed.toLocaleString()}\n`;
              formattedTweet += `Text: ${originalTweet.text}\n`;
            }
          }

          recentSearchResults.push(formattedTweet);
        }

        const recentSearchResultsText = recentSearchResults.join("\n");
        return addHeader(
          "# Recent Search Results for " + searchTerm,
          recentSearchResultsText,
        );
      };

      const recentSearchResults = await searchRecentPosts(
        this.runtime,
        this,
        searchTerm,
      );

      let state = await this.runtime.composeState(message, {
        twitterClient: this.twitterClient,
        twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
        recentSearchResults,
        timeline: formattedHomeTimeline,
        tweetContext: `${tweetBackground}
  
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
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_search_context`,
        context,
      );

      const responseContent = await this.runtime.messageCompletion({
        context,
        stop: [],
        temperature: this.temperature,
      });

      responseContent.inReplyTo = message.id;

      log_to_file(
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_search_response`,
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
              this.runtime.getSetting("TWITTER_USERNAME"),
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
