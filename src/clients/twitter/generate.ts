import { Tweet } from "agent-twitter-client";
import fs from "fs";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { IAgentRuntime } from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { ClientBase } from "./base.ts";
import { generateText } from "../../core/generation.ts";

const newTweetPrompt = `{{timeline}}

{{providers}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{postDirections}}

{{recentPosts}}

{{characterPostExamples}}

# Task: Generate a post in the voice and style of {{agentName}}, aka @{{twitterUserName}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Try to write something totally different than previous posts. Do not add commentary or ackwowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;

export class TwitterGenerationClient extends ClientBase {
  onReady() {
    const generateNewTweetLoop = () => {
      this.generateNewTweet();
      setTimeout(
        generateNewTweetLoop,
        (Math.floor(Math.random() * (45 - 15 + 1)) + 15) * 60 * 1000,
      ); // Random interval between 4-8 hours
    };
    // setTimeout(() => {
      generateNewTweetLoop();
    // }, 5 * 60 * 1000); // Wait 5 minutes before starting the loop
  }

  constructor(runtime: IAgentRuntime) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
    });
  }

  private async generateNewTweet() {
    console.log("Generating new tweet");
    try {
      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        this.runtime.getSetting("TWITTER_USERNAME"),
        this.runtime.character.name,
        "twitter",
      );

      let homeTimeline = [];

      if (!fs.existsSync("tweetcache")) fs.mkdirSync("tweetcache");
      // read the file if it exists
      if (fs.existsSync("tweetcache/home_timeline.json")) {
        homeTimeline = JSON.parse(
          fs.readFileSync("tweetcache/home_timeline.json", "utf-8"),
        );
      } else {
        homeTimeline = await this.fetchHomeTimeline(50);
        fs.writeFileSync(
          "tweetcache/home_timeline.json",
          JSON.stringify(homeTimeline, null, 2),
        );
      }

      const formattedHomeTimeline =
        `# ${this.runtime.character.name}'s Home Timeline\n\n` +
        homeTimeline
          .map((tweet) => {
            return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
          })
          .join("\n");

      const state = await this.runtime.composeState(
        {
          userId: this.runtime.agentId,
          roomId: stringToUuid("twitter_generate_room"),
          content: { text: "", action: "" },
        },
        {
          twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
          timeline: formattedHomeTimeline,
        },
      );
      // Generate new tweet
      const context = composeContext({
        state,
        template: newTweetPrompt,
      });

      const datestr = new Date().toUTCString().replace(/:/g, "-");

      // log context to file
      log_to_file(
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_generate_context`,
        context,
      );

      const newTweetContent = await generateText({
        runtime: this.runtime,
        context,
        modelClass: "slow",
      });
      console.log("New Tweet:", newTweetContent);
      log_to_file(
        `${this.runtime.getSetting("TWITTER_USERNAME")}_${datestr}_generate_response`,
        JSON.stringify(newTweetContent),
      );

      const slice = newTweetContent.replaceAll(/\\n/g, "\n").trim();

      let content = slice
      // .slice(0, 280);
      // // if its bigger than 280, delete the last line
      // if (content.length > 280) {
      //   content = content.slice(0, content.lastIndexOf("\n"));
      // }

      // if(content.length < 1) {
      //   content = slice.slice(0, 280);
      // }

      // Send the new tweet
      if (!this.dryRun) {
        try {
        const result = await this.requestQueue.add(
          async () =>
            await this.twitterClient.sendTweet(content),
        );
        // read the body of the response
        const body = await result.json();
        const tweetResult = body.data.create_tweet.tweet_results.result;

        const tweet = {
          id: tweetResult.rest_id,
          text: tweetResult.legacy.full_text,
          conversationId: tweetResult.legacy.conversation_id_str,
          createdAt: tweetResult.legacy.created_at,
          userId: tweetResult.legacy.user_id_str,
          inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
          permanentUrl: `https://twitter.com/${this.runtime.getSetting("TWITTER_USERNAME")}/status/${tweetResult.rest_id}`,
          hashtags: [],
          mentions: [],
          photos: [],
          thread: [],
          urls: [],
          videos: [],
        } as Tweet;

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
          createdAt: tweet.timestamp * 1000,
          });
        } catch (error) {
          console.error("Error sending tweet:", error);
        }
      } else {
        console.log("Dry run, not sending tweet:", newTweetContent);
      }
    } catch (error) {
      console.error("Error generating new tweet:", error);
    }
  }
}
