import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { ClientBase } from "./base.ts";
import { twitterGenerateRoomId } from "./constants.ts";
import { getRecentConversations, searchRecentPosts } from "./utils.ts";

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

      const recentConversationsText = await getRecentConversations(
        this.runtime,
        this.twitterClient,
        botTwitterUsername,
      );

      // Wait 1.5-3.5 seconds to avoid rate limiting
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 2000) + 1500),
      );

      await Promise.all([
        this.runtime.ensureUserExists(
          this.runtime.agentId,
          settings.TWITTER_USERNAME,
          this.runtime.character.name,
        ),
        this.runtime.ensureRoomExists(twitterGenerateRoomId),
      ]);

      await this.runtime.ensureParticipantInRoom(
        this.runtime.agentId,
        twitterGenerateRoomId,
      );

      await this.ensureRoomIsPopulated(twitterGenerateRoomId);

      const state = await this.runtime.composeState(
        {
          user_id: this.runtime.agentId,
          room_id: twitterGenerateRoomId,
          content: { text: "", action: "" },
        },
        {
          twitterUserName: botTwitterUsername,
          recentConversations: recentConversationsText,
        },
      );
      const recentSearchResultsText = await searchRecentPosts(
        this.runtime,
        this.twitterClient,
        state.topic,
      );
      state["recentSearchResultsText"] = recentSearchResultsText;

      // Generate new tweet
      const context = composeContext({
        state,
        template: newTweetPrompt,
      });

      const datestr = new Date().toISOString().replace(/:/g, "-");

      // log context to file
      log_to_file(`${botTwitterUsername}_${datestr}_generate_context`, context);

      const newTweetContent = await this.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        model: this.runtime.model,
      });
      log_to_file(
        `${botTwitterUsername}_${datestr}_generate_response`,
        JSON.stringify(newTweetContent),
      );

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
