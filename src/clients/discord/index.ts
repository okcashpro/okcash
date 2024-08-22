import { REST } from "@discordjs/rest";
import {
  AudioReceiveStream,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import { UUID } from "crypto";
import {
  Attachment,
  BaseGuildVoiceChannel,
  ChannelType,
  Client,
  Collection,
  Message as DiscordMessage,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Partials,
  Routes,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import { EventEmitter } from "events";
import fs from "fs";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { default as getUuid, default as uuid } from "uuid-by-string";
import WavEncoder from "wav-encoder";
import { Agent } from "../../agent.ts";
import { composeContext } from "../../context.ts";
import { adapter } from "../../db.ts";
import { log_to_file } from "../../logger.ts";
import { embeddingZeroVector } from "../../memory.ts";
import { parseJSONObjectFromText } from "../../parsing.ts";
import { BrowserService } from "../../services/browser.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts";
import { SpeechSynthesizer } from "../../services/speechSynthesis.ts";
import { TranscriptionService } from "../../services/transcription.ts";
import { YouTubeService } from "../../services/youtube.ts";
import settings from "../../settings.ts";
import { Actor, Content, Media, Message, State } from "../../types.ts";
import { AudioMonitor } from "./audioMonitor.ts";
import { commands } from "./commands.ts";
import { InterestChannels, ResponseType } from "./types.ts";

import { Memory } from "../../types.ts";

export class AttachmentManager {
  private imageRecognitionService: ImageRecognitionService;
  private browserService: BrowserService;
  private youtubeService: YouTubeService;
  private attachmentCache: Map<string, Media> = new Map();

  constructor(imageRecognitionService: ImageRecognitionService, browserService: BrowserService, youtubeService: YouTubeService) {
    this.imageRecognitionService = imageRecognitionService;
    this.browserService = browserService;
    this.youtubeService = youtubeService;
  }

  async processAttachments(attachments: Collection<string, Attachment> | Attachment[]): Promise<Media[]> {
    const processedAttachments: Media[] = [];
    const attachmentCollection = attachments instanceof Collection ? attachments : new Collection(attachments.map(att => [att.id, att]));

    for (const [, attachment] of attachmentCollection) {
      const media = await this.processAttachment(attachment);
      if (media) {
        processedAttachments.push(media);
      }
    }
    console.log("[DEBUG] Processed attachments:", processedAttachments);
    return processedAttachments;
  }


  async processAttachment(attachment: Attachment): Promise<Media | null> {
    if (this.attachmentCache.has(attachment.url)) {
      return this.attachmentCache.get(attachment.url)!;
    }

    let media: Media | null = null;
    if (attachment.contentType?.startsWith('image/')) {
      media = await this.processImageAttachment(attachment);
    } else if (attachment.contentType?.startsWith('video/') || this.youtubeService.isVideoUrl(attachment.url)) {
      media = await this.processVideoAttachment(attachment);
    } else {
      media = await this.processGenericAttachment(attachment);
    }

    if (media) {
      this.attachmentCache.set(attachment.url, media);
    }
    return media;
  }

  private async processImageAttachment(attachment: Attachment): Promise<Media> {
    try {
      const recognitionResult = await this.imageRecognitionService.recognizeImage(attachment.url);
      return {
        id: attachment.id,
        url: attachment.url,
        title: 'Image Attachment',
        source: 'Image',
        description: recognitionResult || 'An image attachment',
        text: recognitionResult || 'Image content not available',
      };
    } catch (error) {
      console.error(`Error processing image attachment: ${error.message}`);
      return this.createFallbackImageMedia(attachment);
    }
  }

  private createFallbackImageMedia(attachment: Attachment): Media {
    return {
      id: attachment.id,
      url: attachment.url,
      title: 'Image Attachment',
      source: 'Image',
      description: 'An image attachment (recognition failed)',
      text: `This is an image attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes, Content type: ${attachment.contentType}`,
    };
  }


  private async processVideoAttachment(attachment: Attachment): Promise<Media> {
    if (this.youtubeService.isVideoUrl(attachment.url)) {
      const videoInfo = await this.youtubeService.processVideo(attachment.url);
      return {
        id: attachment.id,
        url: attachment.url,
        title: videoInfo.title,
        source: 'YouTube',
        description: videoInfo.description,
        text: videoInfo.text
      };
    } else {
      return {
        id: attachment.id,
        url: attachment.url,
        title: 'Video Attachment',
        source: 'Video',
        description: 'A video attachment',
        text: 'Video content not available',
      };
    }
  }

  private async processGenericAttachment(attachment: Attachment): Promise<Media> {
    return {
      id: attachment.id,
      url: attachment.url,
      title: 'Generic Attachment',
      source: 'Generic',
      description: 'A generic attachment',
      text: 'Attachment content not available',
    };
  }
}


export const messageHandlerTemplate =
  // `{{actionExamples}}

  // # IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR ACTION EXAMPLE REFERENCE ONLY.

  // ~~~

  // {{lore}}
  // {{relevantFacts}}
  // {{recentFacts}}
  // {{goals}}
  // {{actors}}
  `{{attachments}}
{{providers}}
{{actionNames}}
{{actions}}

{{recentMessages}}

# INSTRUCTIONS: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\``;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly responding to a user, {{agentName}} should IGNORE to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, {{agentName}} should STOP!
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentMessages}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversation.
What does {{agentName}} do? (RESPOND, IGNORE, STOP)`;

// These values are chosen for compatibility with picovoice components
const DECODE_FRAME_SIZE = 1024;
const DECODE_SAMPLE_RATE = 16000;

export class DiscordClient extends EventEmitter {
  private apiToken: string;
  private client: Client;
  private streams: Map<string, Readable> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();
  private agent: Agent;
  private character: any;
  private imageRecognitionService: ImageRecognitionService;
  private speechSynthesizer: SpeechSynthesizer | null = null;
  private browserService: BrowserService;
  private transcriptionService: TranscriptionService;
  private youtubeService: YouTubeService;
  private attachmentManager: AttachmentManager;

  constructor(agent: Agent, character: any) {
    super();
    this.apiToken = settings.DISCORD_API_TOKEN as string;
    this.character = character;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageTyping,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.agent = agent;
    this.browserService = new BrowserService();
    this.transcriptionService = new TranscriptionService();
    this.youtubeService = new YouTubeService(this.transcriptionService);
    this.imageRecognitionService = new ImageRecognitionService(this.agent);
    this.attachmentManager = new AttachmentManager(this.imageRecognitionService, this.browserService, this.youtubeService);

    this.client.once(Events.ClientReady, this.onClientReady.bind(this));
    this.client.login(this.apiToken);

    this.setupEventListeners();
    this.setupCommands();
  }

  private setupEventListeners() {
    this.client.on("voiceStateUpdate", this.handleVoiceStateUpdate.bind(this));
    this.client.on("guildCreate", this.handleGuildCreate.bind(this));
    this.client.on("userStream", this.handleUserStream.bind(this));
    this.client.on(Events.MessageCreate, this.handleMessageCreate.bind(this));
    this.client.on(Events.InteractionCreate, this.handleInteractionCreate.bind(this));
  }

  private setupCommands() {
    const rest = new REST({ version: "9" }).setToken(this.apiToken);
    (async () => {
      try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(
          Routes.applicationCommands(settings.DISCORD_APPLICATION_ID!),
          { body: commands }
        );
        console.log("Successfully reloaded application (/) commands.");
      } catch (error) {
        console.error(error);
      }
    })();
  }

  private async onClientReady(readyClient: { user: { tag: any; id: any } }) {
    console.log(`Logged in as ${readyClient.user?.tag}`);
    console.log("Use this URL to add the bot to your server:");
    console.log(
      `https://discord.com/oauth2/authorize?client_id=${readyClient.user?.id}&scope=bot`
    );
    await this.checkBotAccount();
    await this.onReady();
  }

  private handleVoiceStateUpdate(oldState: VoiceState | null, newState: VoiceState | null) {
    if (newState?.member?.user.bot) return;
    if (newState?.channelId != null && newState?.channelId != oldState?.channelId) {
      this.joinChannel(newState.channel as BaseGuildVoiceChannel);
    }
  }

  private handleGuildCreate(guild: Guild) {
    console.log(`Joined guild ${guild.name}`);
    this.scanGuild(guild);
  }

  private async handleUserStream(
    user_id: UUID,
    userName: string,
    channel: BaseGuildVoiceChannel,
    audioStream: Readable
  ) {
    console.log("handleVoiceStateUpdate", user_id, userName, channel, audioStream);
    const channelId = channel.id;
    const userIdUUID = uuid(user_id) as UUID;
    this.listenToSpokenAudio(
      userIdUUID,
      userName,
      channelId,
      audioStream,
      async (responseAudioStream) => {
        await this.playAudioStream(user_id, responseAudioStream);
      },
      ResponseType.RESPONSE_AUDIO
    );
  }

  async handleMessageCreate(message: DiscordMessage) {
    if (message.interaction || message.author?.bot) return;

    console.log("[DEBUG] Received message:", message.content);

    const user_id = message.author.id as UUID;
    const userName = message.author.username;
    const channelId = message.channel.id;

    await this.browserService.initialize();

    try {
      console.log("[DEBUG] Processing message content");
      const { processedContent, attachments } = await this.processMessageContent(message);
      console.log("[DEBUG] Processed content:", processedContent);
      console.log("[DEBUG] Processed attachments:", attachments);

      await this.handleMessageWithMedia(message, user_id, userName, channelId, processedContent, attachments);
    } catch (error) {
      console.error("Error handling message:", error);
      message.channel.send("Sorry, I encountered an error while processing your request.");
    } finally {
      await this.browserService.closeBrowser();
    }
  }

  private async _saveRequestMessage(message: Message, state: State) {
    console.log('_saveRequestMessage ***')
    console.log(message)
    const { content } = message;

    if ((content as Content).content) {
      const data2 = adapter.db
        .prepare(
          "SELECT * FROM memories WHERE type = ? AND user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1",
        )
        .all("messages", message.user_id, message.room_id) as {
          content: Content;
        }[];

      if (data2.length > 0 && JSON.stringify(data2[0].content) === JSON.stringify(content)) {
        console.log("already saved", data2);
      } else {
        const senderName = state.actorsData?.find(
          (actor: Actor) => actor.id === message.user_id,
        )?.name || "Unknown User";

        const contentWithUser = {
          ...(content as Content),
          user: senderName,
        };

        console.log("[DEBUG] Saving message with attachments:", contentWithUser);

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


  private async processMessageContent(message: DiscordMessage): Promise<{ processedContent: string, attachments: Media[] }> {
    console.log("[DEBUG] Starting processMessageContent");
    let processedContent = message.content;
    let attachments: Media[] = [];

    if (message.attachments.size > 0) {
      console.log("[DEBUG] Message has attachments, processing...");
      attachments = await this.attachmentManager.processAttachments(message.attachments);
      console.log("[DEBUG] Processed attachments:", attachments);
    }

    const urls = this.extractUrls(processedContent);
    if (urls.length > 0) {
      console.log("[DEBUG] URLs found in message, processing...");
      const { updatedContent, urlAttachments } = await this.processUrls(processedContent, urls);
      processedContent = updatedContent;
      attachments = attachments.concat(urlAttachments);
      console.log("[DEBUG] Processed content with URLs:", processedContent);
      console.log("[DEBUG] URL attachments:", urlAttachments);
    }

    return { processedContent, attachments };
  }


  async handleMessageWithMedia(
    message: DiscordMessage,
    user_id: UUID,
    userName: string,
    channelId: string,
    processedContent: string,
    attachments: Media[]
  ) {
    console.log("[DEBUG] Starting handleMessageWithMedia");
    const room_id = getUuid(channelId) as UUID;
    const userIdUUID = getUuid(user_id) as UUID;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

    await this.ensureUserExists(agentId, this.character?.name || await this.fetchBotName(this.apiToken));
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
      attachments: attachments
    };

    console.log("[DEBUG] Content object:", content);

    const state = await this.agent.runtime.composeState(
      { content, user_id: userIdUUID, room_id },
      {
        discordClient: this.client,
        discordMessage: message,
        agentName: this.character.name || this.client.user?.displayName,
      }
    );

    console.log("[DEBUG] Composed state:", state);

    console.log("[DEBUG] Calling handleMessage");

    const response = await this.handleMessage({
      message: {
        content,
        user_id: userIdUUID,
        room_id,
      },
      callback,
      discordClient: this.client,
      discordMessage: message,
      state,
      attachments
    });


    const responseContent = (response.responseMessage || response.content || response.message) as string;

    console.log("[DEBUG] Response content:", responseContent);

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
    interestChannels,
    discordClient,
    discordMessage,
    attachments,
  }: {
    message: Message;
    hasInterest?: boolean;
    shouldIgnore?: boolean;
    shouldRespond?: boolean;
    callback: (response: string) => void;
    state?: State;
    interestChannels?: InterestChannels;
    discordClient: Client;
    discordMessage: DiscordMessage;
    attachments: Media[]
  }): Promise<Content> {
    console.log("[DEBUG] Starting handleMessage");
    console.log("[DEBUG] Initial parameters:", { hasInterest, shouldIgnore, shouldRespond });

    if (!message.content.content) {
      console.log("[DEBUG] Empty message content, ignoring");
      return { content: "", action: "IGNORE" };
    }

    console.log("[DEBUG] Processing message history and extracting attachments");
    let allAttachments = attachments || [];

    if (state.recentMessagesData && Array.isArray(state.recentMessagesData)) {
      allAttachments = allAttachments.concat(state.recentMessagesData.flatMap(msg => msg.content.attachments || []));
    }

    console.log("[DEBUG] All attachments:", allAttachments);

    const formattedAttachments = allAttachments.map(attachment => `
      Name: ${attachment.title}
      URL: ${attachment.url}
      Type: ${attachment.source}
      Description: ${attachment.description}
      Content: ${attachment.text}
      `).join('\n');

    state = {
      ...state,
      attachments: formattedAttachments,
    };

    console.log("[DEBUG] Updated state with attachments:", state);

    message = {
      ...message,
      content: {
        ...message.content,
        attachments
      }
    }


    console.log("[DEBUG] Saving request message");
    await this._saveRequestMessage(message, state);

    console.log("[DEBUG] Updating recent message state");
    state = await this.agent.runtime.updateRecentMessageState(state);

    state = {
      ...state,
      attachments: formattedAttachments,
    };

    if (shouldIgnore) {
      console.log("[DEBUG] shouldIgnore is true, ignoring message");
      return { content: "", action: "IGNORE" };
    }

    if (!shouldRespond && hasInterest) {
      console.log("[DEBUG] Checking if should respond");
      shouldRespond = await this._checkShouldRespond(
        state,
        interestChannels,
        discordMessage,
      );
      console.log("[DEBUG] _checkShouldRespond result:", shouldRespond);
    }

    if (!shouldRespond) {
      console.log("[DEBUG] Not responding to message");
      return { content: "", action: "IGNORE" };
    }

    console.log("[DEBUG] Composing context");
    let context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    console.log('****** CONTEXT')
    console.log(context)

    if (this.agent.runtime.debugMode) {
      console.log("[DEBUG] Response Context:", context);
    }

    console.log("[DEBUG] Generating response");
    const responseContent = await this._generateResponse(
      message,
      state,
      context,
    );
    console.log("[DEBUG] Generated response:", responseContent);

    console.log("[DEBUG] Saving response message");
    await this._saveResponseMessage(message, state, responseContent);

    console.log("[DEBUG] Processing actions");
    this.agent.runtime
      .processActions(message, responseContent, state)
      .then((response: unknown) => {
        if (response && (response as Content).content) {
          console.log("[DEBUG] Calling callback with response content");
          callback((response as Content).content);
        }
      });

    return responseContent;
  }

  private async processMessage(message: any): Promise<{ content: string, processedContent: string, messageAttachments: Media[], media: Media[] }> {
    const content = message.content.content || message.content;
    let processedContent = content;
    const messageAttachments: Media[] = [];
    const media: Media[] = message.media || [];

    const urls = this.extractUrls(content);
    if (urls.length > 0) {
      const { updatedContent, urlAttachments } = await this.processUrls(content, urls);
      processedContent = updatedContent;
      messageAttachments.push(...urlAttachments);
    }

    messageAttachments.push(...media);

    return { content, processedContent, messageAttachments, media };
  }

  private async processUrls(content: string, urls: string[]): Promise<{ updatedContent: string, urlAttachments: Media[] }> {
    let updatedContent = content;
    const urlAttachments: Media[] = [];

    for (const url of urls) {
      if (this.youtubeService.isVideoUrl(url)) {
        console.log("[DEBUG] Processing YouTube video:", url);
        const videoInfo = await this.youtubeService.processVideo(url);
        const replacement = `[YouTube Video: ${videoInfo.title}]`;
        updatedContent = updatedContent.replace(url, replacement);
        urlAttachments.push({
          id: `youtube-${Date.now()}`,
          url: url,
          title: videoInfo.title,
          source: 'YouTube',
          description: videoInfo.description,
          text: videoInfo.text
        });
      } else {
        console.log("[DEBUG] Processing web page:", url);
        const pageContent = await this.browserService.getPageContent(url);
        const summary = await this.summarizeContent(pageContent);
        const replacement = `[Web Page: ${summary.substring(0, 50)}...]`;
        updatedContent = updatedContent.replace(url, replacement);
        urlAttachments.push({
          id: `webpage-${Date.now()}`,
          url: url,
          title: 'Web Page',
          source: 'Web',
          description: summary,
          text: pageContent
        });
      }
    }

    return { updatedContent, urlAttachments };
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  private formatAttachments(attachments: Media[]): string {
    return attachments.map(attachment => `
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Content: ${attachment.text}
  `).join('\n');
  }


  private async summarizeContent(content: string): Promise<string> {
    const prompt = `Summarize the following content in a concise manner:\n\n${content}`;

    for (let i = 0; i < 3; i++) {
      try {
        const response = await this.agent.runtime.completion({
          context: prompt,
          model: 'gpt-4',
          temperature: 0.7
        });
        return response;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === 2) throw error;
      }
    }

    throw new Error('Failed to summarize content after 3 attempts');
  }

  private async processUrl(message: DiscordMessage, url: string) {
    try {
      const content = await this.browserService.getPageContent(url);
      const summary = await this.summarizeContent(content);
      await message.reply(`Summary of ${url}:\n${summary}`);
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
      await message.reply(`Failed to process ${url}. Error: ${error.message}`);
    }
  }

  private async handleInteractionCreate(interaction: any) {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      case "joinchannel":
        await this.handleJoinChannelCommand(interaction);
        break;
      case "leavechannel":
        await this.handleLeaveChannelCommand(interaction);
        break;
    }
  }

  async textToSpeech(text: string): Promise<Readable> {
    if (!this.speechSynthesizer) {
      this.speechSynthesizer = await SpeechSynthesizer.create("./model.onnx");
    }

    console.log("Synthesizing speech...");
    // Synthesize the speech to get a Float32Array of single channel 22050Hz audio data
    const audio = await this.speechSynthesizer.synthesize(text);
    console.log("Speech synthesized");

    // Encode the audio data into a WAV format
    const { encode } = WavEncoder;
    const audioData = {
      sampleRate: 22050,
      channelData: [audio],
    };
    const wavArrayBuffer = encode.sync(audioData);

    // TODO: Move to a temp file
    // Convert the ArrayBuffer to a Buffer and save it to a file
    fs.writeFileSync("buffer.wav", Buffer.from(wavArrayBuffer));

    // now read the file
    const wavStream = fs.createReadStream("buffer.wav");
    return wavStream;
  }

  async recognizeImage(imageUrl: string) {
    console.log("recognizeImage", imageUrl);
    if (!this.imageRecognitionService) {
      console.log("initializeImageRecognitionService");
      this.imageRecognitionService = new ImageRecognitionService(this.agent);
    }
    return await this.imageRecognitionService.recognizeImage(imageUrl);
  }

  async speechToText(audioBuffer: Buffer): Promise<string | null> {
    return this.transcriptionService.transcribe(audioBuffer);
  }

  private extractAnswer(text: string): string {
    const startIndex = text.indexOf("Answer: ") + 8;
    const endIndex = text.indexOf("<|endoftext|>", 11);
    return text.slice(startIndex, endIndex);
  }

  private async ensureUserExists(
    agentId: UUID,
    userName: string,
    botToken: string | null = null,
  ) {
    if (!userName && botToken) {
      userName = this.character?.name || await this.fetchBotName(botToken);
    }
    this.agent.ensureUserExists(agentId, userName);
  }

  private async checkBotAccount() {
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
    const room_id = getUuid(this.client.user?.id as string) as UUID;

    const botName = this.character?.name || await this.fetchBotName(this.apiToken);

    await this.ensureUserExists(agentId, botName, this.apiToken);
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

  private async _saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content,
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
    interestChannels: InterestChannels | undefined,
    discordMessage: DiscordMessage,
  ): Promise<boolean> {
    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(
      `${state.agentName}_${datestr}_shouldrespond_context`,
      shouldRespondContext,
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
          response,
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
      if (interestChannels) delete interestChannels[discordMessage.channelId];
      return false;
    } else {
      console.error("Invalid response:", response);
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
        console.log("Retrying...");
      }

      console.log("response is", response);

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
      console.log("parsedResponse", parsedResponse);
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

  async listenToSpokenAudio(
    user_id: string,
    userName: string,
    channelId: string,
    inputStream: Readable,
    callback: (responseAudioStream: Readable) => void,
    requestedResponseType?: ResponseType,
  ) {
    if (requestedResponseType == null)
      requestedResponseType = ResponseType.RESPONSE_AUDIO;

    const buffers: Buffer[] = [];
    let totalLength = 0;
    const maxSilenceTime = 500;
    let lastChunkTime = Date.now();

    new AudioMonitor(inputStream, 10000000, async (buffer) => {
      const currentTime = Date.now();
      const silenceDuration = currentTime - lastChunkTime;

      buffers.push(buffer);
      totalLength += buffer.length;
      lastChunkTime = currentTime;

      if (silenceDuration > maxSilenceTime || totalLength >= 1000000) {
        const combinedBuffer = Buffer.concat(buffers, totalLength);
        buffers.length = 0;
        totalLength = 0;

        const responseStream = await this.respondToSpokenAudio(
          user_id as UUID,
          userName,
          channelId,
          combinedBuffer,
          requestedResponseType,
        );
        if (responseStream) {
          callback(responseStream as Readable);
        }
      }
    });
  }

  async respondToSpokenAudio(
    user_id: UUID,
    userName: string,
    channelId: string,
    inputBuffer: Buffer,
    requestedResponseType?: ResponseType,
  ): Promise<Readable | null> {
    if (requestedResponseType == null)
      requestedResponseType = ResponseType.RESPONSE_AUDIO;
    const text = await this.speechToText(inputBuffer);
    if (requestedResponseType == ResponseType.SPOKEN_TEXT) {
      return Readable.from(text as string);
    } else {
      return await this.respondToText({
        user_id,
        userName,
        channelId,
        input: text as string,
        requestedResponseType,
      });
    }
  }

  async respondToText({
    user_id,
    userName,
    channelId,
    input,
    requestedResponseType,
    message,
    discordMessage,
    imageAttachments,
    interestChannels,
  }: {
    user_id: UUID;
    userName: string;
    channelId: string;
    input: string;
    requestedResponseType?: ResponseType;
    message?: DiscordMessage;
    imageAttachments?: Attachment[];
    discordMessage?: DiscordMessage;
    interestChannels?: InterestChannels;
  }): Promise<Readable | null> {
    if (requestedResponseType == null)
      requestedResponseType = ResponseType.RESPONSE_AUDIO;

    const room_id = getUuid(channelId) as UUID;
    const userIdUUID = getUuid(user_id) as UUID;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
    const botName = this.character?.name || await this.fetchBotName(this.apiToken);
    await this.ensureUserExists(agentId, botName, this.apiToken);
    await this.ensureUserExists(userIdUUID, userName);
    await this.agent.ensureRoomExists(room_id);
    await this.agent.ensureParticipantInRoom(userIdUUID, room_id);
    await this.agent.ensureParticipantInRoom(agentId, room_id);

    const callback = (response: string) => {
      message?.channel.send(response);
    };

    if (input && input.startsWith("/")) {
      return null;
    }

    const processedAttachments = imageAttachments ? await this.attachmentManager.processAttachments(imageAttachments) : [];

    const response = await this.handleMessage({
      message: {
        content: { content: input, action: "WAIT" },
        user_id: userIdUUID,
        room_id,
      },
      callback,
      interestChannels,
      discordClient: this.client,
      discordMessage: discordMessage as DiscordMessage,
      attachments: processedAttachments
    });

    const content = (response.responseMessage ||
      response.content ||
      response.message) as string;

    if (!content) {
      return null;
    }

    if (requestedResponseType == ResponseType.RESPONSE_TEXT) {
      return Readable.from(content);
    } else {
      return await this.textToSpeech(content);
    }
  }

  private async onReady() {
    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.scanGuild(fullGuild);
    }

    // set the bio back to default
    if (this.character?.bio) {
      adapter.db
        .prepare("UPDATE accounts SET details = ? WHERE id = ?")
        .run(
          JSON.stringify({ summary: this.character.bio }),
          getUuid(this.client.user?.id as string),
        );
    }
  }

  private async scanGuild(guild: Guild) {
    const channels = (await guild.channels.fetch()).filter(
      (channel) => channel?.type == ChannelType.GuildVoice,
    );
    let chosenChannel: BaseGuildVoiceChannel | null = null;

    for (const [, channel] of channels) {
      const voiceChannel = channel as BaseGuildVoiceChannel;
      if (
        voiceChannel.members.size > 0 &&
        (chosenChannel === null ||
          voiceChannel.members.size > chosenChannel.members.size)
      ) {
        chosenChannel = voiceChannel;
      }
    }

    if (chosenChannel != null) {
      this.joinChannel(chosenChannel);
    }
  }

  private async joinChannel(channel: BaseGuildVoiceChannel) {
    const oldConnection = getVoiceConnection(channel.guildId as string);
    if (oldConnection) {
      try {
        oldConnection.destroy();
      } catch (error) {
        console.error("Error leaving voice channel:", error);
      }
    }
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    for (const [, member] of channel.members) {
      if (member.user.bot) continue;
      this.monitorMember(member, channel);
    }

    connection.receiver.speaking.on("start", (user_id: string) => {
      const user = channel.members.get(user_id);
      if (user?.user.bot) return;
      this.monitorMember(user as GuildMember, channel);
      this.streams.get(user_id)?.emit("speakingStarted");
    });

    connection.receiver.speaking.on("end", async (user_id: string) => {
      const user = channel.members.get(user_id);
      if (user?.user.bot) return;
      this.streams.get(user_id)?.emit("speakingStopped");
    });
  }

  private async monitorMember(
    member: GuildMember,
    channel: BaseGuildVoiceChannel,
  ) {
    const user_id = member.id;
    const userName = member.displayName;
    const connection = getVoiceConnection(member.guild.id);
    const receiveStream = connection?.receiver.subscribe(user_id, {
      autoDestroy: true,
      emitClose: true,
    });
    if (receiveStream && receiveStream.readableLength > 0) {
      return;
    }
    const opusDecoder = new prism.opus.Decoder({
      channels: 1,
      rate: DECODE_SAMPLE_RATE,
      frameSize: DECODE_FRAME_SIZE,
    });
    pipeline(
      receiveStream as AudioReceiveStream,
      opusDecoder as any,
      (err: Error | null) => {
        if (err) {
          console.log(`Opus decoding pipeline error: ${err}`);
        }
      },
    );
    this.streams.set(user_id, opusDecoder);
    this.connections.set(user_id, connection as VoiceConnection);
    opusDecoder.on("error", (err: any) => {
      console.log(`Opus decoding error: ${err}`);
    });
    opusDecoder.on("close", () => {
      console.log(`Opus decoder for ${member?.displayName} closed`);
    });
    this.client.emit("userStream", user_id, userName, channel, opusDecoder);
    receiveStream &&
      receiveStream.on("close", () => {
        console.log(`voice stream from ${member?.displayName} closed`);
      });
  }

  async playAudioStream(user_id: UUID, audioStream: Readable) {
    const connection = this.connections.get(user_id);
    if (connection == null) {
      console.log(`No connection for user ${user_id}`);
      return;
    }
    const audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    connection.subscribe(audioPlayer);

    const audioStartTime = Date.now();

    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary,
    });
    audioPlayer.play(resource);

    audioPlayer.on("error", (err: any) => {
      console.log(`Audio player error: ${err}`);
    });

    audioPlayer.on(
      "stateChange",
      (oldState: any, newState: { status: string }) => {
        console.log("Audio player " + newState.status);
        if (newState.status == "idle") {
          const idleTime = Date.now();
          console.log(`Audio playback took: ${idleTime - audioStartTime}ms`);
        }
      },
    );
  }

  private async handleJoinChannelCommand(interaction: any) {
    const channelId = interaction.options.get("channel")?.value as string;
    if (!channelId) {
      await interaction.reply("Please provide a voice channel to join.");
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
      return;
    }
    const voiceChannel = interaction.guild.channels.cache.find(
      (channel: VoiceChannel) =>
        channel.id === channelId && channel.type === ChannelType.GuildVoice,
    );

    if (!voiceChannel) {
      await interaction.reply("Voice channel not found!");
      return;
    }

    try {
      this.joinChannel(voiceChannel as BaseGuildVoiceChannel);
      await interaction.reply(`Joined voice channel: ${voiceChannel.name}`);
    } catch (error) {
      console.error("Error joining voice channel:", error);
      await interaction.reply("Failed to join the voice channel.");
    }
  }

  private async handleLeaveChannelCommand(interaction: any) {
    const connection = getVoiceConnection(interaction.guildId as any);

    if (!connection) {
      await interaction.reply("Not currently in a voice channel.");
      return;
    }

    try {
      connection.destroy();
      await interaction.reply("Left the voice channel.");
    } catch (error) {
      console.error("Error leaving voice channel:", error);
      await interaction.reply("Failed to leave the voice channel.");
    }
  }
}

// Export the DiscordClient class
export default DiscordClient;