import { Scraper, SearchMode } from "agent-twitter-client";
import { default as getUuid } from "uuid-by-string";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { UUID } from "../../core/types.ts";
import { ClientBase } from "./base.ts";
import { isValidTweet, searchRecentPosts } from "./utils.ts";

const twitterGenerateRoomId = getUuid("twitter_generate_room") as UUID;

const newTweetPrompt = `{{recentSearchResultsText}}
{{recentConversations}}
{{recentPosts}}
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{characterPostExamples}}

{{postDirections}}
do not use the "@" in your response
do not use the "#" in your response
no @s, #s, ?s or links

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
      const recentConversations = await this.twitterClient.fetchSearchTweets(
        `@${botTwitterUsername} exclude:retweets`,
        10,
        SearchMode.Latest,
      );
  
      const recentConversationsArray = [];
  
      // Format recent conversations
      for (const conversation of recentConversations.tweets) {
        let formattedConversation = `Name: ${conversation.name} (@${conversation.username})\n`;
        formattedConversation += `Time: ${conversation.timeParsed.toLocaleString()}\n`;
        formattedConversation += `Text: ${conversation.text}\n`;
        
        if (conversation.photos.length > 0) {
          const photoDescriptions = await Promise.all(conversation.photos.map(async (photo) => {
            const description = await this.runtime.imageRecognitionService.recognizeImage(photo.url);
            return `[Photo: ${description.title} - ${description.description}]`;
          }));
          formattedConversation += `Photos: ${photoDescriptions.join(', ')}\n`;
        }
  
        if (conversation.videos.length > 0) {
          const videoTranscriptions = await Promise.all(conversation.videos.map(async (video) => {
            const transcription = await this.runtime.videoService.processVideo(video.url);
            return `[Video Transcription: ${transcription.text}]`;
          }));
          formattedConversation += `Videos: ${videoTranscriptions.join(', ')}\n`;
        }
  
        formattedConversation += `Replies: ${conversation.replies}, Retweets: ${conversation.retweets}, Likes: ${conversation.likes}, Views: ${conversation.views ?? "Unknown"}\n`;
        
        recentConversationsArray.push(formattedConversation);
      }
  
      // Sort recent conversations by timestamp
      recentConversationsArray.sort((a, b) => {
        const timeA = new Date(a.match(/Time: (.*)/)[1]).getTime();
        const timeB = new Date(b.match(/Time: (.*)/)[1]).getTime();
        return timeA - timeB;
      });
  
      const recentConversationsText = recentConversationsArray.join('\n');
  
      // Wait 1.5-3.5 seconds to avoid rate limiting
      const waitTime = Math.floor(Math.random() * 2000) + 1500;
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      
      const state = await this.runtime.composeState({ user_id: this.runtime.agentId, room_id: twitterGenerateRoomId, content: { content: "", action: "" } }, { twitterUserName: botTwitterUsername, recentConversations: recentConversationsText });
      const recentSearchResultsText = await searchRecentPosts(this.runtime, this.twitterClient, state.topic);
      state['recentSearchResultsText'] = recentSearchResultsText;
      
      // Generate new tweet  
      const context = composeContext({
        state,
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
            frequency_penalty: 0.5,
            presence_penalty: 0.5,
            model: this.runtime.model,
          });
          log_to_file(
            `${botTwitterUsername}_${datestr}_generate_response_${3 - triesLeft}`,
            newTweetContent,
          );
          break;
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
