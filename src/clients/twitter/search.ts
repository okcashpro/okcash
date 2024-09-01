import { SearchMode, Tweet } from "agent-twitter-client";
import { UUID } from "crypto";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { Content, Message, State } from "../../core/types.ts";
import { ClientBase } from "./base.ts";
import {
  getRecentConversations,
  isValidTweet,
  searchRecentPosts,
  wait,
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
- Response format should be formatted in a JSON block like this:
\`\`\`json\n{ \"user\": \"{{agentName}}\", \"content\": string, \"action\": string }\`\`\``;

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

      const searchTerm = [
        ...this.runtime.character.topics /*, ...this.character.people*/,
      ][Math.floor(Math.random() * this.runtime.character.topics.length)];

      if (!fs.existsSync("tweets")) {
        fs.mkdirSync("tweets");
      }

      const tweetsArray = await this.twitterClient.fetchSearchTweets(
        searchTerm,
        20,
        SearchMode.Latest,
      );

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
        (tweet) =>
          tweet.id.toString().includes(tweetId) ||
          tweetId.includes(tweet.id.toString()),
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

      const twitterUserId = getUuid(selectedTweet.userId as string) as UUID;
      const twitterRoomId = getUuid("twitter") as UUID;

      await Promise.all([
        this.runtime.ensureUserExists(
          this.runtime.agentId,
          settings.TWITTER_USERNAME,
          this.runtime.character.name,
        ),
        this.runtime.ensureUserExists(
          twitterUserId,
          selectedTweet.username,
          selectedTweet.name,
        ),
        this.runtime.ensureRoomExists(twitterRoomId),
      ]);

      await this.runtime.ensureParticipantInRoom(twitterUserId, twitterRoomId);

      await this.ensureRoomIsPopulated(twitterRoomId);

      const message: Message = {
        content: { text: selectedTweet.text },
        user_id: twitterUserId,
        room_id: twitterRoomId,
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
        const originalTweet = await this.twitterClient.getTweet(
          selectedTweet.id,
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
        this.twitterClient,
        botTwitterUsername,
      );
      await wait();
      const recentSearchResults = await searchRecentPosts(
        this.runtime,
        this.twitterClient,
        searchTerm,
      );

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
${selectedTweet.text}${replyContext.length > 0 && `\nReplies to original post:\n${replyContext}`}\n${`Original post text: ${selectedTweet.text}`}}
${selectedTweet.urls.length > 0 ? `URLs: ${selectedTweet.urls.join(", ")}\n` : ""}${imageDescriptions.length > 0 ? `\nImages in Post (Described): ${imageDescriptions.join(", ")}\n` : ""}
`,
      });

      await this.saveRequestMessage(message, state as State);

      const context = composeContext({
        state,
        template: messageHandlerTemplate,
      });

      console.log("*** Context:", context);
      console.log("**** this.model", this.runtime.model);

      let responseContent: Content | null = null;
      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        const response = await this.runtime.completion({
          context,
          stop: [],
          temperature: this.temperature,
          model: this.runtime.model,
          // images: selectedTweet.photos.map(photo => photo.url), // Pass image URLs to the completion API
        });

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
            text: parsedResponse.text,
            action: parsedResponse.action,
          };
          break;
        }
      }

      if (!responseContent) {
        responseContent = {
          text: "",
          action: "IGNORE",
        };
      }

      await this.saveResponseMessage(message, state, responseContent);
      this.runtime.processActions(message, responseContent, state);

      const response = responseContent;

      if (response.text) {
        console.log(
          `Bot would respond to tweet ${selectedTweet.id} with: ${response.text}`,
        );
        try {
          if (!this.dryRun) {
            await wait();
            await this.twitterClient.sendTweet(response.text, selectedTweet.id);
          } else {
            console.log("Dry run, not sending post:", response.text);
          }
          console.log(`Successfully responded to tweet ${selectedTweet.id}`);
          this.respondedTweets.add(selectedTweet.id);
          const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${selectedTweet.id} - ${selectedTweet.username}: ${selectedTweet.text}\nAgent's Output:\n${response.text}`;
          const debugFileName = `tweets/tweet_generation_${selectedTweet.id}.txt`;
          console.log(`Writing response tweet info to ${debugFileName}`);
          fs.writeFileSync(debugFileName, responseInfo);
        } catch (error) {
          console.error(`Error sending response post: ${error}`);
        }
      }
    } catch (error) {
      console.error("Error engaging with search terms:", error);
    }
  }
}
