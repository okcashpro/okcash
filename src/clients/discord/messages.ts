import { UUID } from "crypto";
import { Client, Message as DiscordMessage } from "discord.js";
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../../agent/index.ts";
import { composeContext } from "../../core/context.ts";
import { adapter } from "../../agent/db.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { BrowserService } from "../../services/browser.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts";
import { generateSummary } from "../../services/summary.ts";
import { TranscriptionService } from "../../services/transcription.ts";
import { YouTubeService } from "../../services/youtube.ts";
import settings from "../../core/settings.ts";
import { Actor, Content, Media, Message, State } from "../../core/types.ts";
import { AttachmentManager } from "./attachments.ts";
import { messageHandlerTemplate, shouldRespondTemplate } from "./templates.ts";
import { InterestChannels } from "./types.ts";

import { TextChannel } from "discord.js";

const MAX_MESSAGE_LENGTH = 1900;

export async function sendMessageInChunks(
  channel: TextChannel,
  content: string,
): Promise<void> {
  const messages = splitMessage(content);
  for (const message of messages) {
    await channel.send(message);
  }
}

function splitMessage(content: string): string[] {
  const messages: string[] = [];
  let currentMessage = "";

  const lines = content.split("\n");
  for (const line of lines) {
    if (currentMessage.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
      messages.push(currentMessage.trim());
      currentMessage = "";
    }
    currentMessage += line + "\n";
  }

  if (currentMessage.trim().length > 0) {
    messages.push(currentMessage.trim());
  }

  return messages;
}

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
    character: any,
  ) {
    this.client = client;
    this.discordClient = discordClient;
    this.agent = agent;
    this.character = character;
    this.browserService = new BrowserService(agent);
    this.transcriptionService = new TranscriptionService();
    this.youtubeService = new YouTubeService(this.transcriptionService);
    this.imageRecognitionService = new ImageRecognitionService(this.agent);
    this.attachmentManager = new AttachmentManager(
      agent,
      this.imageRecognitionService,
      this.browserService,
      this.youtubeService,
    );
  }

  async onReady() {
    await this.checkBotAccount();
  }

  private async ensureUserExists(
    agentId: UUID,
    userName: string,
    botToken: string | null = null,
  ) {
    if (!userName && botToken) {
      userName = this.character?.name || (await this.fetchBotName(botToken));
    }
    console.log(`Ensuring user ${userName} (${agentId}) exists`);
    this.agent.ensureUserExists(agentId, userName);
  }

  async checkBotAccount() {
    const agentId = this.agent.runtime.agentId!;
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

  async handleMessage(message: DiscordMessage) {
    if (message.interaction || message.author?.bot) return;

    const user_id = message.author.id as UUID;
    const userName = message.author.username;
    const channelId = message.channel.id;

    await this.browserService.initialize();

    try {
      const { processedContent, attachments } =
        await this.processMessageMedia(message);

      const audioAttachments = message.attachments.filter((attachment) =>
        attachment.contentType?.startsWith("audio/"),
      );
      if (audioAttachments.size > 0) {
        const processedAudioAttachments =
          await this.attachmentManager.processAttachments(audioAttachments);
        attachments.push(...processedAudioAttachments);
      }

      const room_id = getUuid(channelId) as UUID;
      const userIdUUID = getUuid(user_id) as UUID;
      const agentId = this.agent.runtime.agentId;

      await this.ensureUserExists(
        agentId,
        this.character?.name ||
          (await this.fetchBotName(this.discordClient.apiToken)),
      );
      await this.ensureUserExists(userIdUUID, userName);
      await this.agent.ensureRoomExists(room_id);
      await this.agent.ensureParticipantInRoom(userIdUUID, room_id);
      await this.agent.ensureParticipantInRoom(agentId, room_id);

      let shouldIgnore = false;
      let shouldRespond = true;

      const callback = (content: Content) => {
        sendMessageInChunks(message.channel as TextChannel, content.content);
      };

      const content: Content = {
        content: processedContent,
        action: "WAIT",
        attachments: attachments,
      };

      let state = (await this.agent.runtime.composeState(
        { content, user_id: userIdUUID, room_id },
        {
          discordClient: this.client,
          discordMessage: message,
          agentName: this.character.name || this.client.user?.displayName,
        },
      )) as State;

      let allAttachments = attachments || [];

      if (state.recentMessagesData && Array.isArray(state.recentMessagesData)) {
        allAttachments = allAttachments.concat(
          state.recentMessagesData.flatMap(
            (msg) => msg.content.attachments || [],
          ),
        );
      }

      const formattedAttachments = allAttachments
        .map(
          (attachment) =>
            `ID: ${attachment.id}
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Content: ${attachment.text}
`,
        )
        .join("\n");

      state = {
        ...state,
        attachments: formattedAttachments,
      };

      const messageToHandle: Message = {
        ...{ content, user_id: userIdUUID, room_id },
        content: {
          ...content,
          attachments,
        },
      };

      await this._saveRequestMessage(messageToHandle, state);

      state = await this.agent.runtime.updateRecentMessageState(state);

      state = {
        ...state,
        attachments: formattedAttachments,
      };

      if (!shouldIgnore) {
        shouldIgnore = await this._shouldIgnore(message);
      }

      if (shouldIgnore) {
        return;
      }
      console.log("Interest handling");
      const hasInterest = this._checkInterest(channelId);

      if ((!shouldRespond && hasInterest) || (shouldRespond && !hasInterest)) {
        shouldRespond = await this._shouldRespond(message, state);
      }

      if (!shouldRespond) {
        return;
      }

      let context = composeContext({
        state,
        template: messageHandlerTemplate,
      });

      const responseContent = await this._generateResponse(
        messageToHandle,
        state,
        context,
      );

      await this._saveResponseMessage(messageToHandle, state, responseContent);

      if (responseContent.content) {
        await sendMessageInChunks(
          message.channel as TextChannel,
          responseContent.content,
        );
      }

      await this.agent.runtime.processActions(
        messageToHandle,
        responseContent,
        state,
        callback,
      );
    } catch (error) {
      console.error("Error handling message:", error);
      message.channel.send(
        "Sorry, I encountered an error while processing your request.",
      );
    }
  }

  async processMessageMedia(
    message: DiscordMessage,
  ): Promise<{ processedContent: string; attachments: Media[] }> {
    let processedContent = message.content;
    let attachments: Media[] = [];

    // Process message attachments
    if (message.attachments.size > 0) {
      attachments = await this.attachmentManager.processAttachments(
        message.attachments,
      );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = processedContent.match(urlRegex) || [];

    for (const url of urls) {
      if (this.youtubeService.isVideoUrl(url)) {
        const videoInfo = await this.youtubeService.processVideo(url);
        attachments.push({
          id: `youtube-${Date.now()}`,
          url: url,
          title: videoInfo.title,
          source: "YouTube",
          description: videoInfo.description,
          text: videoInfo.text,
        });
      } else {
        const { title, bodyContent } =
          await this.browserService.getPageContent(url);
        const { title: newTitle, description } = await generateSummary(
          this.agent.runtime,
          title + "\n" + bodyContent,
        );
        attachments.push({
          id: `webpage-${Date.now()}`,
          url: url,
          title: newTitle || "Web Page",
          source: "Web",
          description,
          text: bodyContent,
        });
      }
    }

    return { processedContent, attachments };
  }

  private async _saveRequestMessage(message: Message, state: State) {
    const { content } = message;

    if ((content as Content).content) {
      const data2 = adapter.db
        .prepare(
          "SELECT * FROM memories WHERE type = ? AND user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1",
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

  private async _saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content,
  ) {
    const { room_id } = message;

    responseContent.content = responseContent.content?.trim();

    if (responseContent.content) {
      await this.agent.runtime.messageManager.createMemory({
        user_id: this.agent.runtime.agentId!,
        content: { ...responseContent, user: this.character.name },
        room_id,
        embedding: embeddingZeroVector,
      });
      await this.agent.runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  }

  private _checkInterest(channelId: string): boolean {
    return !!this.interestChannels[channelId];
  }

  private async _shouldIgnore(message: DiscordMessage): Promise<boolean> {
    let messageContent = message.content.toLowerCase();

    // Replace the bot's @ping with the character name
    const botMention = `<@!?${this.client.user?.id}>`;
    messageContent = messageContent.replace(
      new RegExp(botMention, "gi"),
      this.character.name.toLowerCase(),
    );

    // Replace the bot's username with the character name
    const botUsername = this.client.user?.username.toLowerCase();
    messageContent = messageContent.replace(
      new RegExp(`\\b${botUsername}\\b`, "g"),
      this.character.name.toLowerCase(),
    );

    // strip all special characters
    messageContent = messageContent.replace(/[^a-zA-Z0-9\s]/g, "");

    // short responses where ruby should stop talking and disengage unless mentioned again
    const loseInterestWords = [
      "shut up",
      "stop",
      "please shut up",
      "shut up please",
      "dont talk",
      "silence",
      "stop talking",
      "be quiet",
      "hush",
      "wtf",
      "chill",
      "stfu",
      "stupid bot",
      "dumb bot",
      "stop responding",
      "god damn it",
      "god damn",
      "goddamnit",
      "can you not",
      "can you stop",
      "be quiet",
      "hate you",
      "hate this",
      "fuck up",
    ];
    if (
      messageContent.length < 100 &&
      loseInterestWords.some((word) => messageContent.includes(word))
    ) {
      delete this.interestChannels[message.channelId];
      return true;
    }

    const ignoreWords = ["fuck", "shit", "dick", "cock", "sex", "sexy"];
    if (
      messageContent.length < 50 &&
      ignoreWords.some((word) => messageContent.includes(word))
    ) {
      return true;
    }

    const targetedPhrases = [
      this.character.name + " stop responding",
      this.character.name + " stop talking",
      this.character.name + " shut up",
      this.character.name + " stfu",
      "stop talking" + this.character.name,
      this.character.name + " stop talking",
      "shut up " + this.character.name,
      this.character.name + " shut up",
      "stfu " + this.character.name,
      this.character.name + " stfu",
      "chill" + this.character.name,
      this.character.name + " chill",
    ];

    // lose interest if pinged and told to stop responding
    if (targetedPhrases.some((phrase) => messageContent.includes(phrase))) {
      delete this.interestChannels[message.channelId];
      return true;
    }

    // if the message is short, ignore but maintain interest
    if (
      !this.interestChannels[message.channelId] &&
      messageContent.length < 2
    ) {
      return true;
    }

    const ignoreResponseWords = [
      "lol",
      "nm",
      "uh",
      "wtf",
      "stfu",
      "dumb",
      "jfc",
      "omg",
    ];
    if (
      message.content.length < 4 &&
      ignoreResponseWords.some((word) =>
        message.content.toLowerCase().includes(word),
      )
    ) {
      return true;
    }
    console.log("Not ignoring message:", message.content);
    return false;
  }

  private async _shouldRespond(
    message: DiscordMessage,
    state: State,
  ): Promise<boolean> {
    if (message.author.id === this.client.user?.id) return false;
    if (message.author.bot) return false;
    if (message.mentions.has(this.client.user?.id as string)) return true;

    const guild = message.guild;
    const member = guild?.members.cache.get(this.client.user?.id as string);
    const nickname = member?.nickname;

    if (
      message.content
        .toLowerCase()
        .includes(this.client.user?.username.toLowerCase() as string) ||
      message.content
        .toLowerCase()
        .includes(this.client.user?.tag.toLowerCase() as string) ||
      (nickname &&
        message.content.toLowerCase().includes(nickname.toLowerCase()))
    ) {
      console.log("*** SHOULD RESPOND RESPONSE ***", "MENTIONED");
      return true;
    }

    if (!message.guild) {
      console.log("*** SHOULD RESPOND RESPONSE ***", "NO GUILD");
      return true;
    }

    // If none of the above conditions are met, use the completion to decide
    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    const response = await this.agent.runtime.completion({
      context: shouldRespondContext,
      stop: [],
    });

    console.log("*** SHOULD RESPOND RESPONSE ***", response);

    // Parse the response and determine if the agent should respond
    const lowerResponse = response.toLowerCase().trim();
    if (lowerResponse.includes("respond")) {
      return true;
    } else if (lowerResponse.includes("ignore")) {
      return false;
    } else if (lowerResponse.includes("stop")) {
      delete this.interestChannels[message.channelId];
      return false;
    } else {
      console.error("Invalid response from completion:", response);
      return false;
    }
  }

  private async _generateResponse(
    message: Message,
    state: State,
    context: string,
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
          "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)",
        )
        .run([values.body, values.user_id, values.room_id, values.type]);

      const parsedResponse = parseJSONObjectFromText(
        response,
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
}
