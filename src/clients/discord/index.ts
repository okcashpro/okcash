import { REST } from "@discordjs/rest";
import {
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import { pipeline as transformersPipeline } from '@xenova/transformers';
import {
  Content,
  Message,
  State,
  composeContext,
  embeddingZeroVector,
  parseJSONObjectFromText
} from "bgent";
import { UUID } from "crypto";
import {
  BaseGuildVoiceChannel,
  ChannelType,
  Client,
  Message as DiscordMessage,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Partials,
  Routes,
  VoiceState,
} from "discord.js";
import { EventEmitter } from "events";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { default as getUuid, default as uuid } from "uuid-by-string";
import { Agent } from '../../core/agent.ts';
import { adapter } from "../../core/db.ts";
import settings from "../../core/settings.ts";
import { textToSpeech } from "../elevenlabs/index.ts";
import { AudioMonitor } from "./audioMonitor.ts";
import { commands } from "./commands.ts";
import { InterestChannels, ResponseType } from "./types.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts"
import { extractAnswer } from "../../core/util.ts"; 

export const messageHandlerTemplate =
// `{{actionExamples}}

// # IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR ACTION EXAMPLE REFERENCE ONLY.

// ~~~

// {{lore}}
// {{relevantFacts}}
// {{recentFacts}}
// {{goals}}
// {{actors}}
`{{providers}}
{{actionNames}}
{{actions}}

{{recentMessages}}

# INSTRUCTIONS: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ \"user\": \"{{agentName}}\", \"responseMessage\": string, \"action\": string }
\`\`\``;

export const shouldRespondTemplate =
`# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

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
  private bio: string;
  private transcriber: any;
  private imageRecognitionService: ImageRecognitionService;

  constructor(agent: Agent, bio: string) {
    super();
    this.apiToken = settings.DISCORD_API_TOKEN;
    this.bio = bio;
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

    this.initializeTranscriber();

    this.imageRecognitionService = new ImageRecognitionService();
    this.imageRecognitionService.initialize();

    this.client.once(Events.ClientReady, async (readyClient: { user: { tag: any; id: any } }) => {
      console.log(`Logged in as ${readyClient.user?.tag}`);
      console.log("Use this URL to add the bot to your server:");
      console.log(`https://discord.com/oauth2/authorize?client_id=${readyClient.user?.id}&scope=bot`);
      await this.checkBotAccount();
      await this.onReady();
    });

    this.client.login(this.apiToken);

    this.setupEventListeners();
    this.setupCommands();
  }

  private async initializeTranscriber() {
    this.transcriber = await transformersPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  }


  private setupEventListeners() {
    this.client.on("voiceStateUpdate", this.handleVoiceStateUpdate.bind(this));
    this.client.on("guildCreate", this.handleGuildCreate.bind(this));
    this.client.on("userStream", this.handleUserStream.bind(this));
    this.client.on(Events.MessageCreate, this.handleMessageCreate.bind(this));
    this.client.on(Events.InteractionCreate, this.handleInteractionCreate.bind(this));
  }

  private setupCommands() {
    const rest = new REST({ version: "9" }).setToken(settings.DISCORD_API_TOKEN);

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
    const channelId = channel.id;
    const userIdUUID = uuid(user_id) as UUID;
    this.listenToSpokenAudio(
      userIdUUID,
      userName,
      channelId,
      audioStream,
      async (responseAudioStream) => {
        responseAudioStream.on("close", () => {
          console.log("Response audio stream closed");
        });
        await this.playAudioStream(user_id, responseAudioStream);
      },
      ResponseType.RESPONSE_AUDIO
    );
  }

  private async handleMessageCreate(message: DiscordMessage) {
    if (message.interaction) return;
    if (message.author?.bot) return;

    const user_id = message.author.id as UUID;
    const userName = message.author.username;
    const channelId = message.channel.id;

    // Check for image attachments
    if (message.attachments.size > 0) {
      await this.handleImageRecognition(message);
    }

    const textContent = message.content;

    try {
      const responseStream = await this.respondToText({
        user_id,
        userName,
        channelId,
        input: textContent,
        requestedResponseType: ResponseType.RESPONSE_TEXT,
        message,
        discordMessage: message,
        discordClient: this.client,
      });
      if (!responseStream) {
        console.log("No response stream");
        return;
      }
      let responseData = "";
      for await (const chunk of responseStream) {
        responseData += chunk;
      }

      message.channel.send(responseData);
    } catch (error) {
      console.error("Error responding to message:", error);
      message.channel.send("Sorry, I encountered an error while processing your request.");
    }
  }

  private async handleInteractionCreate(interaction: any) {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      case "setname":
        await this.handleSetNameCommand(interaction);
        break;
      case "setbio":
        await this.handleSetBioCommand(interaction);
        break;
      case "joinchannel":
        await this.handleJoinChannelCommand(interaction);
        break;
      case "leavechannel":
        await this.handleLeaveChannelCommand(interaction);
        break;
    }
  }

  async speechToText(audioBuffer: Buffer) {
    if (!this.transcriber) {
      console.log("Transcriber not initialized. Initializing now...");
      await this.initializeTranscriber();
    }
  
    try {
      console.log(`Received audioBuffer of length: ${audioBuffer.length}`);
  
      // Convert the Buffer to a Float32Array
      const float32Array = new Float32Array(audioBuffer.length / 2);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = audioBuffer.readInt16LE(i * 2) / 32768.0;
      }
  
      console.log(`Converted to Float32Array of length: ${float32Array.length}`);
  
      // Run transcription
      let start = performance.now();
      let output = await this.transcriber(float32Array, {
        sampling_rate: 48000, // Discord's default sample rate
      });
      let end = performance.now();
  
      console.log(`Transcription duration: ${(end - start) / 1000} seconds`);
      console.log('Transcription output:', output);
  
      if (!output.text || output.text.length < 5) {
        return null;
      }
      return output.text;
    } catch (error) {
      console.error("Error in speech-to-text conversion:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      return null;
    }
  }

  private async handleImageRecognition(message: DiscordMessage) {
    const attachment = message.attachments.first();
    if (attachment && attachment.contentType?.startsWith('image/')) {
      try {
        const recognizedText = await this.imageRecognitionService.recognizeImage(attachment.url);
        const description = extractAnswer(recognizedText[0]);
        // Add the image description to the completion context
        message.content += `\nImage description: ${description}`;
      } catch (error) {
        console.error('Error recognizing image:', error);
        await message.reply('Sorry, I encountered an error while processing the image.');
      }
    }
  }
  
  private async ensureUserExists(agentId: UUID, userName: string, botToken: string | null = null) {
    if (!userName && botToken) {
      userName = await this.fetchBotName(botToken);
    }
    this.agent.ensureUserExists(agentId, userName);
  }

  private async checkBotAccount() {
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
    const room_id = getUuid(this.client.user?.id as string) as UUID;

    await this.ensureUserExists(
      agentId,
      await this.fetchBotName(settings.DISCORD_API_TOKEN),
      settings.DISCORD_API_TOKEN
    );
    await this.agent.ensureRoomExists(room_id);
    await this.agent.ensureParticipantInRoom(agentId, room_id);

    const botData = adapter.db
      .prepare("SELECT name FROM accounts WHERE id = ?")
      .get(agentId) as { name: string };

    if (!botData.name) {
      const botName = await this.fetchBotName(settings.DISCORD_API_TOKEN);
      adapter.db
        .prepare("UPDATE accounts SET name = ? WHERE id = ?")
        .run(botName, agentId);
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
  }) {
    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }
    if (!state) {
      state = await this.agent.runtime.composeState(message, {
        discordClient,
        discordMessage,
        agentName: this.client.user?.displayName,
      });
    }

    await this._saveRequestMessage(message, state);

    if (shouldIgnore) {
      console.log("shouldIgnore", shouldIgnore);
      return { content: "", action: "IGNORE" };
    }

    state = await this.agent.runtime.composeState(message, {
      discordClient,
      discordMessage,
      agentName: this.client.user?.displayName,
    });

    if (!shouldRespond && hasInterest) {
      shouldRespond = await this._checkShouldRespond(state, interestChannels, discordMessage);
    }

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { content: "", action: "IGNORE" };
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    if (this.agent.runtime.debugMode) {
      console.log(context, "Response Context");
    }

    const responseContent = await this._generateResponse(message, state, context);

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

  private async _saveRequestMessage(message: Message, state: State) {
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
        discordMessage: state.discordMessage,
        discordClient: state.discordClient,
      });
    }
  }

  private async _checkShouldRespond(state: State, interestChannels: InterestChannels | undefined, discordMessage: DiscordMessage): Promise<boolean> {
    const shouldRespondContext = composeContext({
      state,
      template: shouldRespondTemplate,
    });
    console.log("Should respond context: ", shouldRespondContext)
    const response = await this.agent.runtime.completion({
      context: shouldRespondContext,
      temperature: 0.1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    

    console.log("*** response from ", state.agentName, ":", response);

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

  private async _generateResponse(message: Message, state: State, context: string): Promise<Content> {
    let responseContent: Content | null = null;
    const { user_id, room_id } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      console.log("Generating response")
      const response = await this.agent.runtime.completion({
        context,
        stop: [],
      });

      console.log("response is", response)

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

  private async _saveResponseMessage(message: Message, state: State, responseContent: Content) {
    const { room_id } = message;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

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
    console.log('**** BOT DATA: ', data)
    return data.username;
  }

  async listenToSpokenAudio(
    user_id: string,
    userName: string,
    channelId: string,
    inputStream: Readable,
    callback: (responseAudioStream: Readable) => void,
    requestedResponseType?: ResponseType
  ) {
    if (requestedResponseType == null)
      requestedResponseType = ResponseType.RESPONSE_AUDIO;
  
    const buffers: Buffer[] = [];
    let totalLength = 0;
    const maxSilenceTime = 500;
    let lastChunkTime = Date.now();
  
    const monitor = new AudioMonitor(inputStream, 10000000, async (buffer) => {
      const currentTime = Date.now();
      const silenceDuration = currentTime - lastChunkTime;
  
      buffers.push(buffer);
      totalLength += buffer.length;
      lastChunkTime = currentTime;
  
      if (silenceDuration > maxSilenceTime || totalLength >= 1000000) {
        const combinedBuffer = Buffer.concat(buffers, totalLength);
        buffers.length = 0;
        totalLength = 0;
  
        let responseStream = await this.respondToSpokenAudio(
          user_id as UUID,
          userName,
          channelId,
          combinedBuffer,
          requestedResponseType
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
    requestedResponseType?: ResponseType
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
        discordClient: this.client,
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
    discordClient,
    interestChannels,
  }: {
    user_id: UUID;
    userName: string;
    channelId: string;
    input: string;
    requestedResponseType?: ResponseType;
    message?: DiscordMessage;
    discordClient: Client;
    discordMessage?: DiscordMessage;
    interestChannels?: InterestChannels;
  }): Promise<Readable | null> {
    if (requestedResponseType == null)
      requestedResponseType = ResponseType.RESPONSE_AUDIO;

    const room_id = getUuid(channelId) as UUID;
    const userIdUUID = getUuid(user_id) as UUID;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

    await this.ensureUserExists(
      agentId,
      await this.fetchBotName(settings.DISCORD_API_TOKEN),
      settings.DISCORD_API_TOKEN
    );
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
    });

    const content = (response.responseMessage || response.response || response.content || response.message) as string;

    if (!content) {
      return null;
    }

    if (requestedResponseType == ResponseType.RESPONSE_TEXT) {
      return Readable.from(content);
    } else {
      return await textToSpeech(content);
    }
  }

  private async onReady() {
    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.scanGuild(fullGuild);
    }

    // set the bio back to default
    if (this.bio) {
      adapter.db
        .prepare("UPDATE accounts SET details = ? WHERE id = ?")
        .run(
          JSON.stringify({ summary: this.bio }),
          getUuid(this.client.user?.id as string)
        );
    }
  }

  private async scanGuild(guild: Guild) {
    const channels = (await guild.channels.fetch()).filter(
      (channel) => channel?.type == ChannelType.GuildVoice
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
    const oldConnection = getVoiceConnection(channel.guildId as any);
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
    channel: BaseGuildVoiceChannel
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
    pipeline(receiveStream as any, opusDecoder as any, (err: any) => {
      if (err) {
        console.log(`Opus decoding pipeline error: ${err}`);
      }
    });
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
    let audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    connection.subscribe(audioPlayer);

    const audioStartTime = Date.now();

    let resource = createAudioResource(audioStream, {
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
          let idleTime = Date.now();
          console.log(`Audio playback took: ${idleTime - audioStartTime}ms`);
        }
      }
    );
  }

  private async handleSetNameCommand(interaction: any) {
    const newName = interaction.options.get("name")?.value;
    const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
    const userIdUUID = getUuid(interaction.user.id) as UUID;
    const userName = interaction.user.username;
    const room_id = getUuid(interaction.channelId) as UUID;

    await interaction.deferReply();

    await this.ensureUserExists(
      agentId,
      await this.fetchBotName(settings.DISCORD_API_TOKEN),
      settings.DISCORD_API_TOKEN
    );
    await this.ensureUserExists(userIdUUID, userName);
    await this.agent.ensureRoomExists(room_id);
    await this.agent.ensureParticipantInRoom(userIdUUID, room_id);
    await this.agent.ensureParticipantInRoom(agentId, room_id);

    if (newName) {
      try {
        adapter.db
          .prepare("UPDATE accounts SET name = ? WHERE id = ?")
          .run(newName, getUuid(interaction.client.user?.id));

        const guild = interaction.guild;
        if (guild) {
          const botMember = await guild.members.fetch(
            interaction.client.user?.id as string
          );
          await botMember.setNickname(newName as string);
        }

        await interaction.editReply(
          `Agent's name has been updated to: ${newName}`
        );
      } catch (error) {
        console.error("Error updating agent name:", error);
        await interaction.editReply(
          "An error occurred while updating the agent name."
        );
      }
    } else {
      await interaction.editReply(
        "Please provide a new name for the agent."
      );
    }
  }

  private async handleSetBioCommand(interaction: any) {
    const newBio = interaction.options.get("bio")?.value;
    if (newBio) {
      try {
        const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
        const userIdUUID = getUuid(interaction.user.id) as UUID;
        const userName = interaction.user.username;
        const room_id = getUuid(interaction.channelId) as UUID;

        await interaction.deferReply();

        await this.ensureUserExists(
          agentId,
          await this.fetchBotName(settings.DISCORD_API_TOKEN),
          settings.DISCORD_API_TOKEN
        );
        await this.ensureUserExists(userIdUUID, userName);
        await this.agent.ensureRoomExists(room_id);
        await this.agent.ensureParticipantInRoom(userIdUUID, room_id);
        await this.agent.ensureParticipantInRoom(agentId, room_id);

        adapter.db
          .prepare("UPDATE accounts SET details = ? WHERE id = ?")
          .run(
            JSON.stringify({ summary: newBio }),
            getUuid(interaction.client.user?.id)
          );

        await interaction.editReply(
          `Agent's bio has been updated to: ${newBio}`
        );
      } catch (error) {
        console.error("Error updating agent bio:", error);
        await interaction.editReply(
          "An error occurred while updating the agent bio."
        );
      }
    } else {
      await interaction.reply("Please provide a new bio for the agent.");
    }
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
      (channel) =>
        channel.id === channelId && channel.type === ChannelType.GuildVoice
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