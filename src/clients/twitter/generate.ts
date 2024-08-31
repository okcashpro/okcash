import { SearchMode } from "agent-twitter-client";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { State } from "../../core/types.ts";
import { ClientBase } from "./base.ts";

const newTweetPrompt = `{{recentConversations}}

{{recentSearchResults}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{characterPostExamples}}

{{postDirections}}
- do not use the "@" in your response
- do not use the "#" in your response
- no @s, #s, ?s or links

# Task: Generate a post in the voice and style of {{agentName}}, aka @{{twitterUserName}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Try to write something totally different than previous posts. Do not add commentary or ackwowledge this request, just write the post.`;

export class TwitterGenerationClient extends ClientBase {
  onReady() {
    const generateNewTweetLoop = () => {
      this.generateNewTweet();
      setTimeout(
        generateNewTweetLoop,
        Math.floor(Math.random() * 360000) + 1200000,
      ); // Random interval between 10-15 minutes
    };
    generateNewTweetLoop();
  }

  constructor(runtime: AgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
      callback: (self) => self.onReady(),
    });
  }

  private async generateNewTweet() {
    console.log("Generating new tweet");
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error("Twitter username not set in settings");
        return;
      }

      // Get recent conversations
      const recentConversations = this.twitterClient.searchTweets(
        `@${botTwitterUsername}`,
        20,
        SearchMode.Latest,
      );

      const recentConversationsArray = [];
      while (true) {
        const next = await recentConversations.next();
        if (next.done) {
          break;
        }
        recentConversationsArray.push(next.value);
      }
      const recentConversationsText = recentConversationsArray
        .map((tweet) => tweet.text)
        .join("\n");

      // Get recent search results
      const searchTerms = this.runtime.character.topics
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      const recentSearchResults = [];
      for (const searchTerm of searchTerms) {
        const tweets = this.twitterClient.searchTweets(
          searchTerm,
          20,
          SearchMode.Latest,
        );
        const tweetsArray = [];
        while (true) {
          const next = await tweets.next();
          if (next.done) {
            break;
          }
          tweetsArray.push(next.value);
        }
        recentSearchResults.push(...tweetsArray.map((tweet) => tweet.text));
      }
      const recentSearchResultsText = recentSearchResults.join("\n");

      // Generate new tweet
      const context = composeContext({
        state: {
          twitterUserName: botTwitterUsername,
        } as unknown as State,
        template: newTweetPrompt,
      });

      const datestr = new Date().toISOString().replace(/:/g, "-");

      // log context to file
      log_to_file(`${botTwitterUsername}_${datestr}_generate_context`, context);

      let newTweetContent;
      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          newTweetContent = await this.runtime.completion({
            context,
            stop: [],
            temperature: this.temperature,
            frequency_penalty: 0.5, // TODO: tune these and move to settings
            presence_penalty: 0.5, // TODO: tune these and move to settings
            model: this.runtime.model,
          });
          log_to_file(
            `${botTwitterUsername}_${datestr}_generate_response_${3 - triesLeft}`,
            newTweetContent,
          );
        } catch (error) {
          console.warn("Could not generate new tweet:", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      // Send the new tweet
      if (!this.dryRun) {
        await this.twitterClient.sendTweet(newTweetContent.trim());
      } else {
        console.log("Dry run, not sending tweet:", newTweetContent);
      }
    } catch (error) {
      console.error("Error generating new tweet:", error);
    }
  }
}
