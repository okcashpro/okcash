import { Scraper, Tweet } from "agent-twitter-client";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { default as getUuid } from "uuid-by-string";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { twitterGenerateRoomId } from "./constants.ts";

import { fileURLToPath } from "url";
import { embeddingZeroVector } from "../../core/memory.ts";
import { Content, Message, State } from "../../core/types.ts";
import ImageDescriptionService from "../../services/image.ts";

export function extractAnswer(text: string): string {
  const startIndex = text.indexOf("Answer: ") + 8;
  const endIndex = text.indexOf("<|endoftext|>", 11);
  return text.slice(startIndex, endIndex);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ClientBase extends EventEmitter {
  twitterClient: Scraper;
  runtime: AgentRuntime;
  directions: string;
  lastCheckedTweetId: string | null = null;
  imageDescriptionService: ImageDescriptionService;
  temperature: number = 0.5;
  dryRun: boolean = settings.TWITTER_DRY_RUN.toLowerCase() === "true";
  callback: (self: ClientBase) => any = null;

  onReady() {
    throw new Error("Not implemented in base class, please call from subclass");
  }

  constructor({
    runtime,
    callback = null,
  }: {
    runtime: AgentRuntime;
    callback?: (self: ClientBase) => any;
  }) {
    super();
    this.runtime = runtime;
    this.twitterClient = new Scraper();
    this.directions =
      "- " +
      this.runtime.character.style.all.join("\n- ") +
      "- " +
      this.runtime.character.style.post.join();
    this.callback = callback;

    // Check for Twitter cookies
    if (settings.TWITTER_COOKIES) {
      console.log("settings.TWITTER_COOKIES");
      console.log(settings.TWITTER_COOKIES);
      const cookiesArray = JSON.parse(settings.TWITTER_COOKIES);
      this.setCookiesFromArray(cookiesArray);
    } else {
      const cookiesFilePath = path.join(__dirname, "cookies.json");
      if (fs.existsSync(cookiesFilePath)) {
        const cookiesArray = JSON.parse(
          fs.readFileSync(cookiesFilePath, "utf-8"),
        );
        console.log("cookies");
        console.log(cookiesArray);
        this.setCookiesFromArray(cookiesArray);
      } else {
        console.log("settings.TWITTER_USERNAME");
        console.log(settings.TWITTER_USERNAME);
        this.twitterClient
          .login(
            settings.TWITTER_USERNAME,
            settings.TWITTER_PASSWORD,
            settings.TWITTER_EMAIL,
          )
          .then(() => {
            console.log("Logged in to Twitter");
            return this.twitterClient.getCookies();
          })
          .then((cookies) => {
            console.log("cookies");
            console.log(cookies);
            fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies), "utf-8");
          })
          .catch((error) => {
            console.error("Error logging in to Twitter:", error);
          });
      }
    }

    console.log("doing stuff");

    (async () => {
      while (!(await this.twitterClient.isLoggedIn())) {
        console.log("Waiting for Twitter login");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (callback) {
        callback(this);
      }
    })();
  }

  private setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`,
    );
    this.twitterClient.setCookies(cookieStrings);
  }

  async ensureRoomIsPopulated(room_id: UUID) {
    return;
    // Not implemented
    // TODO: Populate the room with the tweet
    const memories = await this.runtime.messageManager.getMemories({
      room_id: room_id,
      count: 1,
    });

    if (memories.length > 0) {
      return;
    }

    let tweetsToPopulate = [];

    // if the room is the default twitter room, we need to populate from our past tweets
    if (room_id === twitterGenerateRoomId) {
      // Populate the room with tweets
      const tweets = await this.twitterClient.getTweets(
        settings.TWITTER_USERNAME,
      );
      for await (const tweet of tweets) {
        tweetsToPopulate.push(tweet);
      }
    }

    //

    for (const tweet of tweetsToPopulate) {
      await this.runtime.messageManager.createMemory({
        user_id: this.runtime.agentId,
        content: { text: tweet.text },
        room_id: room_id,
        embedding: embeddingZeroVector,
        created_at: new Date(tweet.timestamp).toISOString(),
      });
    }
  }

  async saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content,
    userName: string = settings.TWITTER_USERNAME,
  ) {
    const { room_id } = message;
    const agentId = getUuid(userName) as UUID;

    responseContent.content = responseContent.text?.trim();

    if (responseContent.content) {
      console.log("Creating memory 2", {
        user_id: agentId!,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      });
      await this.runtime.ensureUserExists(
        agentId,
        userName,
        this.runtime.character.name,
      );
      await this.runtime.messageManager.createMemory(
        {
          user_id: agentId!,
          content: responseContent,
          room_id,
          embedding: embeddingZeroVector,
        },
        false,
      );
      state = await this.runtime.updateRecentMessageState(state);

      await this.runtime.evaluate(message, state);
    } else {
      console.warn("Empty response, skipping");
    }
  }

  async saveRequestMessage(message: Message, state: State) {
    const { content: senderContent } = message;

    if ((senderContent as Content).text) {
      const recentMessage = await this.runtime.messageManager.getMemories({
        room_id: message.room_id,
        count: 1,
        unique: false,
      });

      if (
        recentMessage.length > 0 &&
        recentMessage[0].content === senderContent
      ) {
        console.log("Message already saved", recentMessage);
      } else {
        console.log("Creating memory", {
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
        await this.runtime.messageManager.createMemory({
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
      }

      await this.runtime.evaluate(message, {
        ...state,
        twitterClient: this.twitterClient,
      });
    }
  }
}
