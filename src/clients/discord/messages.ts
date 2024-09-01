import { UUID } from "crypto";
import { ChannelType, Client, Message as DiscordMessage } from "discord.js";
import { default as getUuid } from "uuid-by-string";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { Content, Media, Message, State } from "../../core/types.ts";
import { generateSummary } from "../../services/summary.ts";
import { AttachmentManager } from "./attachments.ts";
import { messageHandlerTemplate, shouldRespondTemplate } from "./templates.ts";
import { InterestChannels } from "./types.ts";

import { TextChannel } from "discord.js";
import { AgentRuntime } from "../../core/runtime.ts";
import { VoiceManager } from "./voice.ts";

const MAX_MESSAGE_LENGTH = 1900;

export async function sendMessageInChunks(
  channel: TextChannel,
  content: string,
): Promise<void> {
  const messages = splitMessage(content);
  for (const message of messages) {
    if (message.trim().length > 0) {
      await channel.send(message.trim());
    }
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
  private runtime: AgentRuntime;
  private attachmentManager: AttachmentManager;
  private interestChannels: InterestChannels = {};
  private discordClient: any;
  private voiceManager: VoiceManager;

  constructor(discordClient: any, voiceManager: VoiceManager) {
    this.client = discordClient.client;
    this.voiceManager = voiceManager;
    this.discordClient = discordClient;
    this.runtime = discordClient.runtime;
    this.attachmentManager = new AttachmentManager(
      this.runtime,
    );
  }

  async onReady() {
    const agentId = this.runtime.agentId!;
    const room_id = getUuid(this.client.user?.id as string) as UUID;

    await Promise.all([
      this.runtime.ensureUserExists(agentId, this.runtime.character.name),
      this.runtime.ensureRoomExists(room_id),
    ]);
    await this.runtime.ensureParticipantInRoom(agentId, room_id);
  }

  async handleMessage(message: DiscordMessage) {
    if (message.interaction /* || message.author?.bot*/) return;

    const user_id = message.author.id as UUID;
    const userName = message.author.username;
    const channelId = message.channel.id;

    await this.runtime.browserService.initialize();

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
      const agentId = this.runtime.agentId;

      await Promise.all([
        this.runtime.ensureUserExists(agentId, this.runtime.character.name),
        this.runtime.ensureUserExists(userIdUUID, userName),
        this.runtime.ensureRoomExists(room_id),
      ]);

      await Promise.all([
        this.runtime.ensureParticipantInRoom(userIdUUID, room_id),
        this.runtime.ensureParticipantInRoom(agentId, room_id),
      ]);

      let shouldIgnore = false;
      let shouldRespond = true;

      const callback = async (content: Content) => {
        if (message.channel.type === ChannelType.GuildVoice) {
          // For voice channels, use text-to-speech
          const audioStream = await this.voiceManager.textToSpeech(
            content.content,
          );
          await this.voiceManager.playAudioStream(user_id, audioStream);
        } else {
          // For text channels, send the message
          await sendMessageInChunks(
            message.channel as TextChannel,
            content.content,
          );
        }
      };

      const content: Content = {
        content: processedContent,
        attachments: attachments,
        url: message.url,
        replyingTo: message.reference?.messageId ? getUuid(message.reference.messageId) as UUID : undefined,
      };

      const userMessage = { content, user_id: userIdUUID, room_id };

      let state = (await this.runtime.composeState(userMessage, {
        discordClient: this.client,
        discordMessage: message,
        agentName: this.runtime.character.name || this.client.user?.displayName,
      })) as State;

      const messageToHandle: Message = {
        ...userMessage,
        content: {
          ...content,
          attachments,
        },
      };

      await this._saveRequestMessage(messageToHandle, state);

      state = await this.runtime.updateRecentMessageState(state);

      if (!shouldIgnore) {
        shouldIgnore = await this._shouldIgnore(message);
      }

      if (shouldIgnore) {
        return;
      }

      const hasInterest = this._checkInterest(channelId);

      const agentUserState =
        await this.runtime.databaseAdapter.getParticipantUserState(
          room_id,
          this.runtime.agentId,
        );

      if (agentUserState === "MUTED") {
        if (!message.mentions.has(this.client.user.id) && !hasInterest) {
          console.log("Ignoring muted room");
          // Ignore muted rooms unless explicitly mentioned
          return;
        }
      }

      if (agentUserState === "FOLLOWED") {
        console.log("Always responding in followed room");
        shouldRespond = true; // Always respond in followed rooms
      } else if (
        (!shouldRespond && hasInterest) ||
        (shouldRespond && !hasInterest)
      ) {
        console.log("Checking if should respond");
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
        await callback(responseContent);
      }

      await this.runtime.processActions(
        messageToHandle,
        responseContent,
        state,
        callback,
      );
    } catch (error) {
      console.error("Error handling message:", error);
      if (message.channel.type === ChannelType.GuildVoice) {
        // For voice channels, use text-to-speech for the error message
        const errorMessage =
          "Sorry, I encountered an error while processing your request.";
        const audioStream = await this.voiceManager.textToSpeech(errorMessage);
        await this.voiceManager.playAudioStream(user_id, audioStream);
      } else {
        // For text channels, send the error message
        await message.channel.send(
          "Sorry, I encountered an error while processing your request.",
        );
      }
    }
  }

  async processMessageMedia(
    message: DiscordMessage,
  ): Promise<{ processedContent: string; attachments: Media[] }> {
    let processedContent = message.content;
    let attachments: Media[] = [];

    // Process code blocks in the message content
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(processedContent))) {
      const codeBlock = match[1];
      const lines = codeBlock.split("\n");
      const title = lines[0];
      const description = lines.slice(0, 3).join("\n");
      const attachmentId =
        `code-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(-5);
      attachments.push({
        id: attachmentId,
        url: "",
        title: title || "Code Block",
        source: "Code",
        description: description,
        text: codeBlock,
      });
      processedContent = processedContent.replace(
        match[0],
        `Code Block (${attachmentId})`,
      );
    }

    // Process message attachments
    if (message.attachments.size > 0) {
      attachments = await this.attachmentManager.processAttachments(
        message.attachments,
      );
    }

    // TODO: Move to attachments manager
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = processedContent.match(urlRegex) || [];

    for (const url of urls) {
      if (this.runtime.videoService.isVideoUrl(url)) {
        const videoInfo = await this.runtime.videoService.processVideo(url);
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
          await this.runtime.browserService.getPageContent(url);
        const { title: newTitle, description } = await generateSummary(
          this.runtime,
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
    const { content: senderContent } = message;

    if ((senderContent as Content).content) {
      await this.runtime.messageManager.createMemory({
        user_id: message.user_id,
        content: senderContent,
        room_id: message.room_id,
        embedding: embeddingZeroVector,
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
      await this.runtime.messageManager.createMemory({
        user_id: this.runtime.agentId,
        content: { ...responseContent, user: this.runtime.character.name },
        room_id,
        embedding: embeddingZeroVector,
      });
      // refresh messages
      state = await this.runtime.updateRecentMessageState(state);
      await this.runtime.evaluate(message, state);
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
      this.runtime.character.name.toLowerCase(),
    );

    // Replace the bot's username with the character name
    const botUsername = this.client.user?.username.toLowerCase();
    messageContent = messageContent.replace(
      new RegExp(`\\b${botUsername}\\b`, "g"),
      this.runtime.character.name.toLowerCase(),
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

    // If we're not interested in the channel and it's a short message, ignore it
    if (
      messageContent.length < 10 &&
      !this.interestChannels[message.channelId]
    ) {
      return true;
    }

    const targetedPhrases = [
      this.runtime.character.name + " stop responding",
      this.runtime.character.name + " stop talking",
      this.runtime.character.name + " shut up",
      this.runtime.character.name + " stfu",
      "stop talking" + this.runtime.character.name,
      this.runtime.character.name + " stop talking",
      "shut up " + this.runtime.character.name,
      this.runtime.character.name + " shut up",
      "stfu " + this.runtime.character.name,
      this.runtime.character.name + " stfu",
      "chill" + this.runtime.character.name,
      this.runtime.character.name + " chill",
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
    // if (message.author.bot) return false;
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

    let response = "";

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      try {
        response = await this.runtime.completion({
          context: shouldRespondContext,
          stop: ["\n"],
          max_response_length: 5,
        });
        break;
      } catch (error) {
        console.error("Error in _shouldRespond:", error);
        // wait for 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("Retrying...");
      }
    }

    console.log("*** SHOULD RESPOND RESPONSE ***", response);

    // Parse the response and determine if the runtime should respond
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
        response = await this.runtime.messageCompletion({
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

      await this.runtime.databaseAdapter.log({
        body: { message, context, response },
        user_id: user_id,
        room_id,
        type: "response",
      });

      const parsedResponse = parseJSONObjectFromText(
        response,
      ) as unknown as Content;
      if (!parsedResponse) {
        continue;
      }
      responseContent = {
        content: parsedResponse.content,
        action: parsedResponse.action,
      };
      break;
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
