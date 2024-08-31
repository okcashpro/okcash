import { SearchMode, Tweet } from "agent-twitter-client";
import { UUID } from "crypto";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { ClientBase } from "./base.ts";
import { log_to_file } from "../../core/logger.ts";
import { addHeader, composeContext } from "../../core/context.ts";
import { Message, State, Content } from "../../core/types.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";

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

  private async wait(minDuration = 1000, maxDuration = 3000) {
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.floor(Math.random() * (maxDuration - minDuration)) + minDuration,
      ),
    );
  }

  private isValidTweet(tweet: Tweet): boolean {
    // Filter out tweets with too many hashtags, @s, or $ signs, probably spam or garbage
    const hashtagCount = (tweet.text.match(/#/g) || []).length;
    const atCount = (tweet.text.match(/@/g) || []).length;
    const dollarSignCount = tweet.text.match(/\$/g) || [];
    const totalCount = hashtagCount + atCount + dollarSignCount.length;

    return hashtagCount <= 1 && atCount <= 2 && dollarSignCount.length <= 1 && totalCount <= 3;
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

      const tweetsIterator = this.twitterClient.searchTweets(
        searchTerm,
        20,
        SearchMode.Latest,
      );
      const tweetsArray: Tweet[] = [];
      for await (const tweet of tweetsIterator) {
        if (this.isValidTweet(tweet) && !this.respondedTweets.has(tweet.id)) {
          tweetsArray.push(tweet);
        }
      }

      if (tweetsArray.length === 0) {
        console.log("No valid tweets found for the search term");
        return;
      }

      const prompt = `
Here are some tweets related to the search term "${searchTerm}":

${tweetsArray
          .map(
            (tweet) => `
  ID: ${tweet.id}
  Username: ${tweet.username}
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
      const selectedTweet = tweetsArray.find(
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
        this.runtime.ensureUserExists(twitterUserId, selectedTweet.username),
        this.runtime.ensureRoomExists(twitterRoomId),
      ]);

      await this.runtime.ensureParticipantInRoom(twitterUserId, twitterRoomId);

      const message: Message = {
        content: { content: selectedTweet.text },
        user_id: twitterUserId,
        room_id: twitterRoomId,
      };

      if (!message.content.content) {
        return { content: "", action: "IGNORE" };
      }

      // Fetch replies and retweets
      const replies = await this.getReplies(selectedTweet.id);
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
        const description = await this.describeImage(photo.url);
        imageDescriptions.push(description);
      }

      console.log("****** imageDescriptions");
      console.log(imageDescriptions);

      await this.wait();
      const recentConversations = await this.getRecentConversations();
      await this.wait();
      const recentSearchResults = await this.getRecentSearchResults();

      const formatRecentConversations = (conversations: Tweet[]) => {
        return conversations
          .reverse()
          .map(
            (tweet) =>
              `@${tweet.username}: ${tweet.text.replace(/\n/g, "\\n")}`,
          )
          .join("\n");
      };

      const formatRecentSearchResults = (searchResults: Tweet[]) => {
        return searchResults
          .map(
            (tweet) => `${tweet.username}: ${tweet.text.replace(/\n/g, "\\n")}`,
          )
          .join("\n");
      };

      const state = await this.runtime.composeState(message, {
        twitterClient: this.twitterClient,
        twitterMessage: message,
        twitterUserName: botTwitterUsername,
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
          `Bot would respond to tweet ${selectedTweet.id} with: ${response.content}`,
        );
        try {
          if (!this.dryRun) {
            await this.twitterClient.sendTweet(
              response.content,
              selectedTweet.id,
            );
          } else {
            console.log("Dry run, not sending post:", response.content);
          }
          console.log(`Successfully responded to tweet ${selectedTweet.id}`);
          this.respondedTweets.add(selectedTweet.id);
          const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${selectedTweet.id} - ${selectedTweet.username}: ${selectedTweet.text}\nAgent's Output:\n${response.content}`;
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

  private async getRecentConversations(): Promise<Tweet[]> {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    const recentConversations = this.twitterClient.searchTweets(
      `@${botTwitterUsername}`,
      20,
      SearchMode.Latest,
    );

    const recentConversationsArray = [];
    for await (const conversation of recentConversations) {
      recentConversationsArray.push(conversation);
    }

    return recentConversationsArray.reverse();
  }

  private async getRecentSearchResults(): Promise<Tweet[]> {
    const recentSearchResults = [];
    const searchTerm = this.runtime.character.topics
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .join(" ");

    const tweets = this.twitterClient.searchTweets(
      searchTerm,
      10,
      SearchMode.Latest,
    );
    for await (const tweet of tweets) {
      recentSearchResults.push(tweet);
    }

    if (!fs.existsSync("searches")) {
      fs.mkdirSync("searches");
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const searchResultsFileName = `searches/search_results_${timestamp}.txt`;
    fs.writeFileSync(
      searchResultsFileName,
      JSON.stringify(recentSearchResults, null, 2),
    );

    return recentSearchResults;
  }
}
