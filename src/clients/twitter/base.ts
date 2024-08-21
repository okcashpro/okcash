import { Scraper, Tweet } from "agent-twitter-client";
import {
  Content,
  Message,
  State,
  embeddingZeroVector
} from "bgent";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import fs from "fs";
import path from 'path';
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../../core/agent.ts";
import { adapter } from "../../core/db.ts";
import settings from "../../core/settings.ts";

import { fileURLToPath } from 'url';
import ImageRecognitionService from "../../services/imageRecognition.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type Character = {
  name: string,
  bio: string,
  people: string[],
  topics: string[],
  adjectives: string[],
  style: {
    all: string[],
    chat: string[],
    post: string[]
  }
}

export class ClientBase extends EventEmitter {
  twitterClient: Scraper;
  agent: Agent;
  character: Character;
  directions: string;
  model: string;
  lastCheckedTweetId: string | null = null;
  imageRecognitionService: ImageRecognitionService;
  temperature: number = 0.5;
  callback: (self: ClientBase) => any = null;

  onReady() {
    throw new Error("Not implemented in base class, please call from subclass");
  }

  constructor({ agent, character, model = 'gpt-4o-mini', callback = null }: {
    agent: Agent,
    character: Character,
    model?: string,
    callback?: (self: ClientBase) => any
  }) {
    super()
    this.agent = agent;
    this.twitterClient = new Scraper();
    this.character = character;
    this.directions = "- " + character.style.all.join("\n- ") + "- " + character.style.post.join()
    this.callback = callback;
    this.model = model;
    this.imageRecognitionService = new ImageRecognitionService(this.agent);
  
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
      } else {
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
  
    console.log("doing stuff");
  
    (async () => {
      while (!(await this.twitterClient.isLoggedIn())) {
        console.log('Waiting for Twitter login');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if(callback) {
        callback(this);
      }
    })()
  }

  private setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(cookie =>
      `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? 'Secure' : ''}; ${cookie.httpOnly ? 'HttpOnly' : ''}; SameSite=${cookie.sameSite || 'Lax'}`
    );
    this.twitterClient.setCookies(cookieStrings);
  }

  async getReplies(tweetId: string): Promise<Tweet[]> {
    // TODO: Fix this
    // We can get all data for a tweet and see who has replied to it
    return [];
  }

  async describeImage(imageUrl: string): Promise<string> {
    try {
      const description = await this.imageRecognitionService.recognizeImage(imageUrl);
      return description || 'Unable to describe the image.';
    } catch (error) {
      console.error('Error describing image:', error);
      return 'Error occurred while describing the image.';
    }
  }

  async describeGif(imageUrl: string): Promise<string> {
    // TODO:
    // get the first frame of the gif
    // describe image
    return ''
  }

  async searchArxiv(query: string): Promise<string> {
    // TODO: Search Arxiv for a topic, find a paper, summarize it and return the link and summary
    return '';
  }

  async generateImage(description: string): Promise<string> {
    // TODO: Implement this and return an image which can be added to a tweet http request
    return '';
  }

  async summarizeWebpage(url: string): Promise<string> {
    // TODO: Visit with playwright, get content, summarize
    return '';
  }

  async saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content,
    userName: string = settings.TWITTER_USERNAME
  ) {
    const { room_id } = message;
    const agentId = getUuid(
      userName
    ) as UUID;

    responseContent.content = responseContent.content?.trim();

    if (responseContent.content) {
      console.log("Creating memory 2", {
        user_id: agentId!,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      })
      await this.agent.ensureUserExists(agentId, userName);
      await this.agent.runtime.messageManager.createMemory({
        user_id: agentId!,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      },
        false);
      await this.agent.runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  };

  async saveRequestMessage(message: Message, state: State) {
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
        console.log("Creating memory", {
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        })
        await this.agent.runtime.messageManager.createMemory({
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
      }
      await this.agent.runtime.evaluate(message, {
        ...state,
        twitterMessage: message,
        twitterClient: this.twitterClient,
      });
    }
  };
}