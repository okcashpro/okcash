import { UUID } from "crypto";
import { Client, Message as DiscordMessage } from "discord.js";
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../../agent.ts";
import { composeContext } from "../../context.ts";
import { adapter } from "../../db.ts";
import { log_to_file } from "../../logger.ts";
import { embeddingZeroVector } from "../../memory.ts";
import { parseJSONObjectFromText } from "../../parsing.ts";
import { BrowserService } from "../../services/browser.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts";
import { TranscriptionService } from "../../services/transcription.ts";
import { YouTubeService } from "../../services/youtube.ts";
import settings from "../../settings.ts";
import { Actor, Content, Media, Message, State } from "../../types.ts";
import { InterestChannels } from "./types.ts";

import { AttachmentManager } from "./attachments.ts";
import { messageHandlerTemplate, shouldRespondTemplate } from "./templates.ts";

export class MessageManager {
  private client: Client;
  private agent: Agent;
  private character: any;
  private imageRecognitionService: ImageRecognitionService;
  private browserService: BrowserService;
  private transcriptionService: TranscriptionService;
  private youtubeService: YouTubeService;
  private attachmentManager: AttachmentManager;
  private interestChannels: InterestChannels = {};
  discordClient: any;

  constructor(
    discordClient: any,
    client: Client,
    agent: Agent,
    character: any
  ) {
    this.client = client;
    this.discordClient = discordClient;
    this.agent = agent;
    this.character = character;
    this.browserService = new BrowserService();
    this.transcriptionService = new TranscriptionService();
    this.youtubeService = new YouTubeService(this.transcriptionService);
    this.imageRecognitionService = new ImageRecognitionService(this.agent);
    this.attachmentManager = new AttachmentManager(
      this.imageRecognitionService,
      this.browserService,
      this.youtubeService
    );
  }

  async onReady() {
    await this.checkBotAccount();
  }

  private async ensureUserExists(
    agentId: UUID,
    userName: string,
    botToken: string | null = null
  ) {
    if (!userName && botToken) {
      userName = this.character?.name || (await this.fetchBotName(botToken));
    }
    this.agent.ensureUserExists(agentId, userName);
  }

  async checkBotAccount() {
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
    const room_id = getUuid(this.client.user?.id as string) as UUID;

    const botName =
      this.character?.name ||
      (await this.fetchBotName(this.discordClient.apiToken));

    await this.ensureUserExists(agentId, botName, this.discordClient.apiToken);
    await this.agent.ensureRoomExists(room_id);
    await this.agent.ensureParticipantInRoom(agentId, room_id);

    const botData = adapter.db
      .prepare("SELECT name FROM accounts WHERE id = ?")
      .get(agentId) as { name: string };

    if (!botData.name) {
      adapter.db
        .prepare("UPDATE accounts SET name = ? WHERE id = ?")
        .run(botName, agentId);
    }
  }

  async handleMessageCreate(message: DiscordMessage) {
    if (message.interaction || message.author?.bot) return;

    const user_id = message.author.id as UUID;
    const userName = message.author.username;
    const channelId = message.channel.id;

    await this.browserService.initialize();

    try {
      const { processedContent, attachments } =
        await this.processMessageContent(message);

      const audioAttachments = message.attachments.filter((attachment) =>
        attachment.contentType?.startsWith("audio/")
      );
      if (audioAttachments.size > 0) {
        const processedAudioAttachments =
          await this.attachmentManager.processAttachments(audioAttachments);
        attachments.push(...processedAudioAttachments);
      }

      await this.handleMessageWithMedia(
        message,
        user_id,
        userName,
        channelId,
        processedContent,
        attachments
      );
    } catch (error) {
      console.error("Error handling message:", error);
      message.channel.send(
        "Sorry, I encountered an error while processing your request."
      );
    } finally {
      await this.browserService.closeBrowser();
    }
  }

  private async _saveRequestMessage(message: Message, state: State) {
    const { content } = message;

    if ((content as Content).content) {
      const data2 = adapter.db
        .prepare(
          "SELECT * FROM memories WHERE type = ? AND user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .all("messages", message.user_id, message.room_id) as {
        content: Content;
      }[];

      if (
        data2.length > 0 &&
        JSON.stringify(data2[0].content) === JSON.stringify(content)
      ) {
      } else {
        const senderName =
          state.actorsData?.find((actor: Actor) => actor.id === message.user_id)
            ?.name || "Unknown User";

        const contentWithUser = {
          ...(content as Content),
          user: senderName,
        };

        await this.agent.runtime.messageManager.createMemory({
          user_id: message.user_id,
          content: contentWithUser,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
      }
      await this.agent.runtime.evaluate(message, {
        ...state,
        discordMessage: state.discordMessage,
        discordClient: state.discordClient,
      });
    }
  }

  async processMessageContent(
    message: DiscordMessage
  ): Promise<{ processedContent: string; attachments: Media[] }> {
    let processedContent = message.content;
    let attachments: Media[] = [];

    if (message.attachments.size > 0) {
      attachments = await this.attachmentManager.processAttachments(
        message.attachments
      );
    }

    const urls = this.extractUrls(processedContent);
    if (urls.length > 0) {
      const { updatedContent, urlAttachments } = await this.processUrls(
        processedContent,
        urls
      );
      processedContent = updatedContent;
      attachments = attachments.concat(urlAttachments);
    }

    return { processedContent, attachments };
  }

  private async processUrls(
    content: string,
    urls: string[]
  ): Promise<{ updatedContent: string; urlAttachments: Media[] }> {
    let updatedContent = content;
    const urlAttachments: Media[] = [];

    for (const url of urls) {
      if (this.youtubeService.isVideoUrl(url)) {
        const videoInfo = await this.youtubeService.processVideo(url);
        urlAttachments.push({
          id: `youtube-${Date.now()}`,
          url: url,
          title: videoInfo.title,
          source: "YouTube",
          description: videoInfo.description,
          text: videoInfo.text,
        });
      } else {
        const pageContent = await this.browserService.getPageContent(url);
        urlAttachments.push({
          id: `webpage-${Date.now()}`,
          url: url,
          title: "Web Page",
          source: "Web",
          description: pageContent.slice(0, 100) + "...",
          text: pageContent,
        });
      }

      const replacement = `[${urlAttachments[urlAttachments.length - 1].title}]`;
      updatedContent = updatedContent.replace(url, replacement);
    }

    return { updatedContent, urlAttachments };
  }

  async handleMessageWithMedia(
    message: DiscordMessage,
    user_id: UUID,
    userName: string,
    channelId: string,
    processedContent: string,
    attachments: Media[]
  ) {
    const room_id = getUuid(channelId) as UUID;
    const userIdUUID = getUuid(user_id) as UUID;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

    await this.ensureUserExists(
      agentId,
      this.character?.name ||
        (await this.fetchBotName(this.discordClient.apiToken))
    );
    await this.ensureUserExists(userIdUUID, userName);
    await this.agent.ensureRoomExists(room_id);
    await this.agent.ensureParticipantInRoom(userIdUUID, room_id);
    await this.agent.ensureParticipantInRoom(agentId, room_id);

    const callback = (response: string) => {
      message.channel.send(response);
    };

    const content: Content = {
      content: processedContent,
      action: "WAIT",
      attachments: attachments,
    };

    const state = await this.agent.runtime.composeState(
      { content, user_id: userIdUUID, room_id },
      {
        discordClient: this.client,
        discordMessage: message,
        agentName: this.character.name || this.client.user?.displayName,
      }
    );

    const response = await this.handleMessage({
      message: {
        content,
        user_id: userIdUUID,
        room_id,
      },
      callback,
      discordMessage: message,
      state,
      attachments,
    });

    const responseContent = (response.responseMessage ||
      response.content ||
      response.message) as string;

    if (responseContent) {
      message.channel.send(responseContent);
    }
  }

  async handleMessage({
    message,
    hasInterest = true,
    shouldIgnore = false,
    shouldRespond = true,
    callback,
    state,
    discordMessage,
    attachments = [],
  }: {
    message: Message;
    hasInterest?: boolean;
    shouldIgnore?: boolean;
    shouldRespond?: boolean;
    callback: (response: string) => void;
    state?: State;
    discordMessage?: DiscordMessage;
    attachments?: Media[];
  }): Promise<Content> {
    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }

    let allAttachments = attachments || [];

    if (state.recentMessagesData && Array.isArray(state.recentMessagesData)) {
      allAttachments = allAttachments.concat(
        state.recentMessagesData.flatMap((msg) => msg.content.attachments || [])
      );
    }

    const formattedAttachments = allAttachments
      .map(
        (attachment) =>
          `Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Content: ${attachment.text}
`
      )
      .join("\n");

    state = {
      ...state,
      attachments: formattedAttachments,
    };

    message = {
      ...message,
      content: {
        ...message.content,
        attachments,
      },
    };

    await this._saveRequestMessage(message, state);

    state = await this.agent.runtime.updateRecentMessageState(state);

    state = {
      ...state,
      attachments: formattedAttachments,
    };

    if (shouldIgnore) {
      return { content: "", action: "IGNORE" };
    }

    if (!shouldRespond && hasInterest) {
      shouldRespond = await this._checkShouldRespond(state, discordMessage);
    }

    if (!shouldRespond) {
      return { content: "", action: "IGNORE" };
    }

    let context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    const responseContent = await this._generateResponse(
      message,
      state,
      context
    );

    await this._saveResponseMessage(message, state, responseContent);

    this.agent.runtime
      .processActions(message, responseContent, state)
      .then((response: unknown) => {
        if (response && (response as Content).content) {
          callback((response as Content).content);
        }
      });

    return responseContent;
  }

  private async _saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content
  ) {
    const { room_id } = message;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

    responseContent.content = responseContent.content?.trim();

    if (responseContent.content) {
      await this.agent.runtime.messageManager.createMemory({
        user_id: agentId!,
        content: { ...responseContent, user: this.character.name },
        room_id,
        embedding: embeddingZeroVector,
      });
      await this.agent.runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  }

  private async _checkShouldRespond(
    state: State,
    discordMessage: DiscordMessage
  ): Promise<boolean> {
    const interestChannels = this.interestChannels;
    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${state.agentName}_${datestr}_shouldrespond_context`,
      shouldRespondContext
    );

    let response;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      try {
        response = await this.agent.runtime.completion({
          context: shouldRespondContext,
          temperature: 0.1,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        });
        log_to_file(
          `${state.agentName}_${datestr}_shouldrespond_response`,
          response
        );
      } catch (error) {
        console.error("Error in _checkShouldRespond:", error);
        console.log("Retrying...");
      }
    }

    if (response == null) {
      console.error("No response in _checkShouldRespond");
      return false;
    }

    if (response.toLowerCase().includes("respond")) {
      return true;
    } else if (response.toLowerCase().includes("ignore")) {
      return false;
    } else if (response.toLowerCase().includes("stop")) {
      if (interestChannels && this.interestChannels[discordMessage.channelId])
        delete this.interestChannels[discordMessage.channelId];
      return false;
    } else {
      console.error("Invalid response:", response);
      return false;
    }
  }

  private async _generateResponse(
    message: Message,
    state: State,
    context: string
  ): Promise<Content> {
    let responseContent: Content | null = null;
    const { user_id, room_id } = message;

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(`${state.agentName}_${datestr}_generate_context`, context);

    let response;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      try {
        response = await this.agent.runtime.completion({
          context,
          stop: [],
        });
      } catch (error) {
        console.error("Error in _generateResponse:", error);
        // wait for 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("Retrying...");
      }

      if (!response) {
        continue;
      }

      log_to_file(`${state.agentName}_${datestr}_generate_response`, response);

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
      // if (
      //   !(parsedResponse?.user as string)?.includes(
      //     (state as State).senderName as string
      //   )
      // ) {
      if (!parsedResponse) {
        continue;
      }
      responseContent = {
        content: parsedResponse.content,
        action: parsedResponse.action,
      };
      break;
      // }
    }

    if (!responseContent) {
      responseContent = {
        content: "",
        action: "IGNORE",
      };
    }

    return responseContent;
  }

  private async summarizeContent(content: string): Promise<string> {
    const prompt = `Summarize the following content in a concise manner:\n\n${content}`;

    for (let i = 0; i < 3; i++) {
      try {
        const response = await this.agent.runtime.completion({
          context: prompt,
          model: "gpt-4",
          temperature: 0.7,
        });
        return response;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === 2) throw error;
      }
    }

    throw new Error("Failed to summarize content after 3 attempts");
  }

  async fetchBotName(botToken: string) {
    const url = "https://discord.com/api/v10/users/@me";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching bot details: ${response.statusText}`);
    }

    const data = await response.json();
    return data.username;
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }
}
