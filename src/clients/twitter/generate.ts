import { SearchMode } from "agent-twitter-client";
import {
  State,
  composeContext
} from "bgent";
import { Agent } from "../../core/agent.ts";
import settings from "../../core/settings.ts";
import { ClientBase } from "./base.ts";
import { log_to_file } from "../../core/logger.ts";

const newTweetPrompt =
`{{recentConversations}}

{{recentSearchResults}}

{{agentName}}'s bio:
{{bio}}

{{directions}}
- do not use the "@" in your response
- do not use the "#" in your response
- no @s, #s, ?s or links

INSTRUCTIONS: Write a single sentence status update that is {{adjective}} about {{topic}} without mentioning {{topic}} directly, from the perspective of {{agentName}}`;

export class TwitterGenerationClient extends ClientBase {

  onReady() {
    const generateNewTweetLoop = () => {
      this.generateNewTweet();
      setTimeout(generateNewTweetLoop, Math.floor(Math.random() * 360000) + 1200000); // Random interval between 10-15 minutes
    };
    generateNewTweetLoop()
  }

  constructor(agent: Agent, character: any, model: string) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      agent, character, model, callback: (self) => self.onReady()
    });
  }

  private async generateNewTweet() {
    console.log('Generating new tweet');
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error('Twitter username not set in settings');
        return;
      }

      // Get recent conversations
      const recentConversations = this.twitterClient.searchTweets(`@${botTwitterUsername}`, 20, SearchMode.Latest);

      const recentConversationsArray = [];
      while (true) {
        const next = await recentConversations.next();
        if (next.done) {
          break;
        }
        recentConversationsArray.push(next.value)
      }
      const recentConversationsText = (recentConversationsArray).map(tweet => tweet.text).join('\n');

      // Get recent search results
      const searchTerms = this.character.topics.sort(() => Math.random() - 0.5).slice(0, 2);
      const recentSearchResults = [];
      for (const searchTerm of searchTerms) {
        const tweets = this.twitterClient.searchTweets(searchTerm, 20, SearchMode.Latest);
        const tweetsArray = [];
        while (true) {
          const next = await tweets.next();
          if (next.done) {
            break;
          }
          tweetsArray.push(next.value)
        }
        recentSearchResults.push(...(tweetsArray).map(tweet => tweet.text));
      }
      const recentSearchResultsText = recentSearchResults.join('\n');

      // Generate new tweet
      const context = composeContext({
        state: {
          agentName: botTwitterUsername,
          name: botTwitterUsername,
          bio: this.character.bio,
          recentConversations: recentConversationsText,
          recentSearchResults: recentSearchResultsText,
          topic: this.character.topics[Math.floor(Math.random() * this.character.topics.length)],
          directions: this.directions,
          adjective: this.character.adjectives[Math.floor(Math.random() * this.character.adjectives.length)]
          
        } as unknown as State,
        template: newTweetPrompt,

      });

      const datestr = new Date().toISOString().replace(/:/g, '-');
        
      // log context to file
      log_to_file(`${botTwitterUsername}_${datestr}_generate_context`, context)

      let newTweetContent;
      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try{

          newTweetContent = await this.agent.runtime.completion({
            context,
            stop: [],
            temperature: this.temperature,
            frequency_penalty: 0.5, // TODO: tune these and move to settings
            presence_penalty: 0.5, // TODO: tune these and move to settings
            model: this.model,
          });
          log_to_file(`${botTwitterUsername}_${datestr}_generate_response_${3 - triesLeft}`, newTweetContent)
        } catch (error) {
          console.warn('Could not generate new tweet:', error);
          console.log("Retrying...")
        }
      }

      // Send the new tweet
      await this.twitterClient.sendTweet(newTweetContent.trim());
    } catch (error) {
      console.error('Error generating new tweet:', error);
    }
  }
}