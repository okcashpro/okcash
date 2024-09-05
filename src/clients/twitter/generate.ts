import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { ClientBase } from "./base.ts";

const newTweetPrompt = `{{recentPosts}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

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
        (Math.floor(Math.random() * (60 - 45 + 1)) + 45) * 60 * 1000,
      ); // Random interval between 45-60 minutes
    };
    generateNewTweetLoop();
  }

  constructor(runtime: AgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
    });
  }

  private async generateNewTweet() {
    console.log("Generating new tweet");
    try {
      // const recentConversationsText = await getRecentConversations(
      //   this.runtime,
      //   this,
      //   this.runtime.getSetting("TWITTER_USERNAME"),
      // );

      // Wait 1.5-3.5 seconds to avoid rate limiting
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 2000) + 1500),
      );

      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        this.runtime.getSetting("TWITTER_USERNAME"),
        this.runtime.character.name,
        "twitter",
      );

      const state = await this.runtime.composeState(
        {
          userId: this.runtime.agentId,
          roomId: stringToUuid("twitter_generate_room"),
          content: { text: "", action: "" },
        },
        {
          twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
          // recentConversations: recentConversationsText,
        },
      );
      // const recentSearchResultsText = await searchRecentPosts(
      //   this.runtime,
      //   this,
      //   state.topic as string,
      // );
      // state["recentSearchResultsText"] = recentSearchResultsText;

      // Generate new tweet
      const context = composeContext({
        state,
        template: newTweetPrompt,
      });

      const datestr = new Date().toISOString().replace(/:/g, "-");

      // log context to file
      log_to_file(
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_generate_context`,
        context,
      );

      const newTweetContent = await this.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        model: this.runtime.model,
      });
      log_to_file(
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_generate_response`,
        JSON.stringify(newTweetContent),
      );

      // Send the new tweet
      if (!this.dryRun) {
        const success = await this.requestQueue.add(
          async () =>
            await this.twitterClient.sendTweet(newTweetContent.trim()),
        );

        if (success) {
          const tweet = await this.requestQueue.add(
            async () =>
              await this.twitterClient.getLatestTweet(
                this.runtime.getSetting("TWITTER_USERNAME"),
              ),
          );
          if (!tweet) {
            console.error("Failed to get latest tweet after posting it");
            return;
          }

          const postId = tweet.id;
          const conversationId = tweet.conversationId;
          const roomId = stringToUuid(conversationId);

          await this.runtime.ensureRoomExists(roomId);
          await this.runtime.ensureParticipantInRoom(
            this.runtime.agentId,
            roomId,
          );
          await this.cacheTweet(tweet);

          await this.runtime.messageManager.createMemory({
            id: stringToUuid(postId),
            userId: this.runtime.agentId,
            content: {
              text: newTweetContent.trim(),
              url: tweet.permanentUrl,
              source: "twitter",
            },
            roomId,
            embedding: embeddingZeroVector,
            createdAt: new Date(tweet.timestamp * 1000),
          });
        } else {
          console.error("Failed to post tweet");
        }
      } else {
        console.log("Dry run, not sending tweet:", newTweetContent);
      }
    } catch (error) {
      console.error("Error generating new tweet:", error);
    }
  }
}
