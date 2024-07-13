import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import {
  Content,
  Message,
  State,
  composeContext,
  embeddingZeroVector,
  messageHandlerTemplate,
  parseJSONObjectFromText
} from "bgent";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import fs from "fs";
import path from 'path';
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../agent.ts";
import { adapter } from "../db.ts";
import settings from "../settings.ts";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const shouldRespondTemplate = `
# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE to messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentMessages}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversaiton.`;

export class TwitterClient extends EventEmitter {
    private twitterClient: Scraper;
    private agent: Agent;
    private bio: string;
    private lastCheckedTweetId: string | null = null;
  
    constructor(agent: Agent, bio: string) {
      super()
      this.agent = agent;
      this.twitterClient = new Scraper();
      this.bio = bio;
  
      // Check for Twitter cookies
      if (settings.TWITTER_COOKIES) {
        console.log("settings.TWITTER_COOKIES")
        console.log(settings.TWITTER_COOKIES)
        const cookiesArray = JSON.parse(settings.TWITTER_COOKIES);
        this.setCookiesFromArray(cookiesArray);
      } else {
        const cookiesFilePath = path.join(__dirname, 'cookies.json');
        if (fs.existsSync(cookiesFilePath)) {
          const cookiesArray = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
          console.log("cookies")
          console.log(cookiesArray)
          this.setCookiesFromArray(cookiesArray);
        }  else {
          console.log("settings.TWITTER_USERNAME")
          console.log(settings.TWITTER_USERNAME)
          this.twitterClient.login(settings.TWITTER_USERNAME, settings.TWITTER_PASSWORD, settings.TWITTER_EMAIL)
            .then(() => {
              console.log('Logged in to Twitter')
              return this.twitterClient.getCookies();
            })
            .then((cookies) => {
              console.log("cookies")
              console.log(cookies)
              fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies), 'utf-8');
            })
            .catch((error) => {
              console.error('Error logging in to Twitter:', error);
            });
        }
        
      }

      (async () => {
        while (!(await this.twitterClient.isLoggedIn())) {
          console.log('Waiting for Twitter login');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        
        // handle interactions once
        this.handleTwitterInteractions();
        // now loop every minute
        this.startTwitterLoop();

      })()

    }

    private setCookiesFromArray(cookiesArray: any[]) {
      const cookieStrings = cookiesArray.map(cookie => 
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? 'Secure' : ''}; ${cookie.httpOnly ? 'HttpOnly' : ''}; SameSite=${cookie.sameSite || 'Lax'}`
      );
      this.twitterClient.setCookies(cookieStrings);
    }
        
    
    private async handleTwitterInteractions() {
      console.log('Checking Twitter interactions');
      try {
        const botTwitterUsername = settings.TWITTER_USERNAME;
        if (!botTwitterUsername) {
          console.error('Twitter username not set in settings');
          return;
        }
  
        // Check for mentions
        const mentions = this.twitterClient.searchTweets(`@${botTwitterUsername}`, 20, SearchMode.Latest);
        for await (const tweet of mentions) {
          if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId) break;
          await this.handleTweet(tweet);
        }
  
        // Check for replies to the bot's tweets
        const botTweets = this.twitterClient.getTweets(botTwitterUsername, 20);
        for await (const tweet of botTweets) {
          if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId) break;
          const replies = this.twitterClient.searchTweets(`to:${botTwitterUsername}`, 20, SearchMode.Latest);
          for await (const reply of replies) {
            if (reply.inReplyToStatusId === tweet.id) {
              await this.handleTweet(reply);
            }
          }
        }
  
        // Update the last checked tweet ID
        const latestTweet = await this.twitterClient.getLatestTweet(botTwitterUsername);
        if (latestTweet) {
          this.lastCheckedTweetId = latestTweet.id;
        }
        console.log('Finished checking Twitter interactions, latest tweet is:', latestTweet);
      } catch (error) {
        console.error('Error handling Twitter interactions:', error);
      }
    }
  
    private async handleTweet(tweet: Tweet) {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (tweet.username === botTwitterUsername) {
        // Skip processing if the tweet is from the bot itself
        return;
      }
      const twitterUserId = getUuid(tweet.userId as string) as UUID;
      const twitterRoomId = getUuid('twitter') as UUID;
  
      await this.agent.ensureUserExists(twitterUserId, tweet.username);
      await this.agent.ensureRoomExists(twitterRoomId);
      await this.agent.ensureParticipantInRoom(twitterUserId, twitterRoomId);
  
      const message: Message = {
        content: { content: tweet.text, action: "WAIT" },
        user_id: twitterUserId,
        room_id: twitterRoomId,
      };
  
      const response = await this.handleMessage({
        message,
        shouldIgnore: false,
        shouldRespond: true,
        callback: async (responseText: string) => {
          console.log(`Responding to tweet ${tweet.id}: ${responseText}`);
        },
      });
  
      if (response.content) {
        console.log(`Bot would respond to tweet ${tweet.id} with: ${response.content}`);
        try {
          // await this.twitterClient.sendTweet(response.content, tweet.id);
          console.log(`Successfully responded to tweet ${tweet.id}`);
        } catch (error) {
          console.error(`Error sending response tweet: ${error}`);
        }
      }
    }
  
    private startTwitterLoop() {
      console.log('Starting Twitter interaction loop');
      setInterval(() => {
        this.handleTwitterInteractions();
      }, 60000); // Check every minute
    }
  
    async handleMessage({
      message,
      shouldIgnore = false,
      shouldRespond = true,
      callback,
      state,
      twitterClient,
      twitterMessage,
    }: {
      message: Message;
      shouldIgnore?: boolean;
      shouldRespond?: boolean;
      callback: (response: string) => void;
      state?: State;
      twitterClient?: Scraper;
      twitterMessage?: Tweet;
    }): Promise<Content> {
      if (!message.content.content) {
        return { content: "", action: "IGNORE" };
      }
      if (!state) {
        state = await this.agent.runtime.composeState(message, {
          twitterClient,
          twitterMessage,
        });
      }
  
      const _saveRequestMessage = async (message: Message, state: State) => {
        const { content: senderContent } = message;
  
        if ((senderContent as Content).content) {
          const data2 = adapter.db
            .prepare(
              "SELECT * FROM memories WHERE type = ? AND user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1"
            )
            .all("messages", message.user_id, message.room_id) as {
              content: Content;
            }[];
  
          if (data2.length > 0 && data2[0].content === message.content) {
            console.log("already saved", data2);
          } else {
            await this.agent.runtime.messageManager.createMemory({
              user_id: message.user_id,
              content: senderContent,
              room_id: message.room_id,
              embedding: embeddingZeroVector,
            });
          }
          await this.agent.runtime.evaluate(message, {
            ...state,
            twitterMessage,
            twitterClient,
          });
        }
      };
  
      await _saveRequestMessage(message, state as State);
  
      if (shouldIgnore) {
        console.log("shouldIgnore", shouldIgnore);
        return { content: "", action: "IGNORE" };
      }
  
      const nickname = settings.TWITTER_USERNAME;
      state = await this.agent.runtime.composeState(message, {
        twitterClient,
        twitterMessage,
        agentName: nickname || "Ruby",
      });
  
      if (!shouldRespond) {
        const shouldRespondContext = composeContext({
          state,
          template: shouldRespondTemplate,
        });
  
        const response = await this.agent.runtime.completion({
          context: shouldRespondContext,
          stop: [],
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
  
      console.log("*** context");
      console.log(context);
  
      if (this.agent.runtime.debugMode) {
        console.log(context, "Response Context");
      }
  
      let responseContent: Content | null = null;
      const { user_id, room_id } = message;
  
      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        const response = await this.agent.runtime.completion({
          context,
          stop: [],
        });
  
        const values = {
          body: response,
          user_id: user_id,
          room_id,
          type: "response",
        };
  
        adapter.db
          .prepare(
            "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)"
          )
          .run([values.body, values.user_id, values.room_id, values.type]);
  
        const parsedResponse = parseJSONObjectFromText(
          response
        ) as unknown as Content;
        console.log("parsedResponse", parsedResponse);
        if (
          !(parsedResponse?.user as string)?.includes(
            (state as State).senderName as string
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
  
      const _saveResponseMessage = async (
        message: Message,
        state: State,
        responseContent: Content
      ) => {
        const { room_id } = message;
        const agentId = getUuid(
          settings.DISCORD_APPLICATION_ID as string
        ) as UUID;
  
        responseContent.content = responseContent.content?.trim();
  
        if (responseContent.content) {
          await this.agent.runtime.messageManager.createMemory({
            user_id: agentId!,
            content: responseContent,
            room_id,
            embedding: embeddingZeroVector,
          });
          await this.agent.runtime.evaluate(message, { ...state, responseContent });
        } else {
          console.warn("Empty response, skipping");
        }
      };
  
      await _saveResponseMessage(message, state, responseContent);
      this.agent.runtime
        .processActions(message, responseContent, state)
        .then((response: unknown) => {
          if (response && (response as Content).content) {
            callback((response as Content).content);
          }
        });
  
      return responseContent;
    }
  }