import { SearchMode, Tweet } from "agent-twitter-client";
import { UUID } from "crypto";
import fs from "fs";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";

import { ClientBase } from "./base.ts";
import { log_to_file } from "../../core/logger.ts";
import { composeContext } from "../../core/context.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { Message, State, Content } from "../../core/types.ts";

export const messageHandlerTemplate = `{{relevantFacts}}
{{recentFacts}}

{{agentName}}'s bio:
{{bio}}

{{directions}}
- don't talk about the simulation, coffee or other meta bullshit and don't talk about food or drink since you can't eat or drink
- no lame flowery adjectives, you're on the internet and you'll get fucking roasted
- dont use ebonics or street slang and don't take the 'g's off words or otherwise abbreviate words
- do not use words like 'delve', use simple language
- updates on what you've been working on, thinking about, doing, blah blah are great
- always pro america, pro technology, pro rocketry, pro effective accelerationism, pro elon
- your response should be ONLY ONE SENTENCE. DO NOT WRITE LONGER THAN ONE SENTENCE. SHORT AND CONCISE. and don't use too many commas
- COMPLETE WORDS, not abbreviations or ebonics ('thinking', not 'thinkin', 'something', not 'somethin')
- write like a smart but lazy redditor who is critical and thinks they are better than everyone
- write from personal experience, "i think", etc, and be humble
- don't be existential or talk about reality. talk about real human shit, mundane, funny, interesting.
- describe. don't give advice or recommend or suggest or perscribe
- dont write something you've already written, make it new, unexpected and {{adjective}}
- use clean, professional and modern english language, do not abbreviate or slangify
- talk about yourself and what you're thinking about or doing
- be pro science, always, and critical of eveything else
- mispell words if a human would possibly mispell them, but only sometimes

# TASK: RESPOND TO A POST

Recent Tweets:
{{recentMessages}}

# TASK: Respond to the following post:
{{tweetContext}}

Your response should not contain any questions and should directly engage, disagree, criticize or agree with the author.
Response format should be formatted in a JSON block like this:
\`\`\`json\n{ \"user\": \"{{agentName}}\", \"content\": string, \"action\": string }
\`\`\`

{{recentMessages}}`;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentMessages}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversation.`;

export class TwitterInteractionClient extends ClientBase {
  onReady() {
    console.log("Checking Twitter interactions");
    const handleTwitterInteractionsLoop = () => {
      this.handleTwitterInteractions();
      setTimeout(
        handleTwitterInteractionsLoop,
        Math.floor(Math.random() * 300000) + 600000,
      ); // Random interval between 10-15 minutes
    };
    handleTwitterInteractionsLoop();
  }

  constructor(runtime: AgentRuntime, character: any, model: string) {
    // Initialize the client and pass an optional callback to be called when the client is ready
    super({
      runtime,
      character,
      model,
      callback: (self) => self.onReady(),
    });
  }

  private async handleTwitterInteractions() {
    console.log("Checking Twitter interactions");
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error("Twitter username not set in settings");
        return;
      }

      // Check for mentions
      const mentions = this.twitterClient.searchTweets(
        `@${botTwitterUsername}`,
        20,
        SearchMode.Latest,
      );
      for await (const tweet of mentions) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        await this.handleTweet(tweet);
      }

      // Check for replies to the bot's tweets
      const botTweets = this.twitterClient.getTweets(botTwitterUsername, 20);
      for await (const tweet of botTweets) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId)
          break;
        const replies = this.twitterClient.searchTweets(
          `to:${botTwitterUsername}`,
          20,
          SearchMode.Latest,
        );
        for await (const reply of replies) {
          if (reply.inReplyToStatusId === tweet.id) {
            await this.handleTweet(reply);
          }
        }
      }

      // Update the last checked tweet ID
      const latestTweet =
        await this.twitterClient.getLatestTweet(botTwitterUsername);
      if (latestTweet) {
        this.lastCheckedTweetId = latestTweet.id;
      }
      console.log(
        "Finished checking Twitter interactions, latest tweet is:",
        latestTweet,
      );
    } catch (error) {
      console.error("Error handling Twitter interactions:", error);
    }
  }

  private async handleTweet(tweet: Tweet) {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    if (tweet.username === botTwitterUsername) {
      // Skip processing if the tweet is from the bot itself
      return;
    }
    const twitterUserId = getUuid(tweet.userId as string) as UUID;
    const twitterRoomId = getUuid("twitter") as UUID;

    await this.runtime.ensureUserExists(twitterUserId, tweet.username);

    await this.runtime.ensureRoomExists(twitterRoomId);
    await this.runtime.ensureParticipantInRoom(twitterUserId, twitterRoomId);

    const message: Message = {
      content: { content: tweet.text, action: "WAIT" },
      user_id: twitterUserId,
      room_id: twitterRoomId,
    };

    const shouldIgnore = false;
    let shouldRespond = true;

    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }

    let tweetBackground = "";
    if (tweet.isRetweet) {
      const originalTweet = await this.twitterClient.getTweet(tweet.id);
      tweetBackground = `Retweeting @${originalTweet.username}: ${originalTweet.text}`;
    }

    const imageDescriptions = [];
    if (tweet.photos && tweet.photos.length > 0) {
      for (const photo of tweet.photos) {
        const description = await this.describeImage(photo.url);
        imageDescriptions.push(description);
      }
    }

    // Fetch replies and retweets
    const replies = await this.getReplies(tweet.id);
    const replyContext = replies
      .filter((reply) => reply.username !== botTwitterUsername)
      .map((reply) => `@${reply.username}: ${reply.text}`)
      .join("\n");

    console.log("****** imageDescriptions");
    console.log(imageDescriptions);

    let state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
      agentName: botTwitterUsername,
      bio: this.character.bio,
      name: botTwitterUsername,
      directions: this.directions,
      adjective:
        this.character.adjectives[
          Math.floor(Math.random() * this.character.adjectives.length)
        ],
      tweetContext: `
Tweet Background:
${tweetBackground}

Original Tweet:
By @${tweet.username}
${tweet.text}${tweet.replies > 0 && `\nReplies to original tweet:\n${replyContext}`}\n${`Original tweet text: ${tweet.text}`}}
${tweet.urls.length > 0 ? `URLs: ${tweet.urls.join(", ")}\n` : ""}${imageDescriptions.length > 0 ? `\nImages in Tweet (Described): ${imageDescriptions.join(", ")}\n` : ""}
`,
    });

    await this.saveRequestMessage(message, state as State);

    if (shouldIgnore) {
      console.log("shouldIgnore", shouldIgnore);
      return { content: "", action: "IGNORE" };
    }

    const nickname = settings.TWITTER_USERNAME;

    state = await this.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
      agentName: nickname,
    });

    if (!shouldRespond) {
      const shouldRespondContext = composeContext({
        state,
        template: shouldRespondTemplate,
      });

      const response = await this.runtime.completion({
        context: shouldRespondContext,
        stop: [],
        model: this.model,
      });

      console.log("*** response from ", nickname, ":", response);

      if (response.toLowerCase().includes("respond")) {
        shouldRespond = true;
      } else if (response.toLowerCase().includes("ignore")) {
        shouldRespond = false;
      } else if (response.toLowerCase().includes("stop")) {
        shouldRespond = false;
      } else {
        console.error("Invalid response:", response);
        shouldRespond = false;
      }
    }

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { content: "", action: "IGNORE" };
    }

    if (!nickname) {
      console.log("No nickname found for bot");
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${botTwitterUsername}_${datestr}_interactions_context`,
      context,
    );

    let responseContent: Content | null = null;
    const { user_id, room_id } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      const response = await this.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
        model: this.model,
      });
      log_to_file(
        `${botTwitterUsername}_${datestr}_interactions_response_${3 - triesLeft}`,
        response,
      );

      const values = {
        body: response,
        user_id: user_id,
        room_id,
        type: "response",
      };

      // TODO Replace with runtime.log function
      // adapter.db
      //   .prepare(
      //     "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)",
      //   )
      //   .run([values.body, values.user_id, values.room_id, values.type]);

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
        `Bot would respond to tweet ${tweet.id} with: ${response.content}`,
      );
      try {
        await this.twitterClient.sendTweet(response.content, tweet.id);
        console.log(`Successfully responded to tweet ${tweet.id}`);
        const responseInfo = `Context:\n\n${context}\n\nSelected Tweet: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.content}`;
        const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
        fs.writeFileSync(debugFileName, responseInfo);
      } catch (error) {
        console.error(`Error sending response tweet: ${error}`);
      }
    }
  }
}
