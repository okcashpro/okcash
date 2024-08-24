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
  BaseGuildVoiceChannel,
  ChannelType,
  Client,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import fs from "fs";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { default as getUuid } from "uuid-by-string";
import WavEncoder from "wav-encoder";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { SpeechSynthesizer } from "../../services/speechSynthesis.ts";
import { TranscriptionService } from "../../services/transcription.ts";
import { AudioMonitor } from "./audioMonitor.ts";
import { MessageManager } from "./messages.ts";

import EventEmitter from "events";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import { Actor, Character, Content, Message, State } from "../../core/types.ts";
import { textToSpeech } from "../elevenlabs/index.ts";
import { voiceHandlerTemplate } from "./templates.ts";

// These values are chosen for compatibility with picovoice components
const DECODE_FRAME_SIZE = 1024;
const DECODE_SAMPLE_RATE = 16000;

export class VoiceManager extends EventEmitter {
  private client: Client;
  private runtime: AgentRuntime;
  private streams: Map<string, Readable> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();
  private speechSynthesizer: SpeechSynthesizer | null = null;
  transcriptionService: TranscriptionService;
  character: Character;

  constructor(client: any) {
    super();
    this.client = client.client;
    this.character = client.runtime.character;
    this.runtime = client.runtime;
    this.transcriptionService = new TranscriptionService();
  }

  async handleVoiceStateUpdate(
    oldState: VoiceState | null,
    newState: VoiceState | null,
  ) {
    if (newState?.member?.user.bot) return;
    if (
      newState?.channelId != null &&
      newState?.channelId != oldState?.channelId
    ) {
      this.joinChannel(newState.channel as BaseGuildVoiceChannel);
    }
  }

  async handleGuildCreate(guild: Guild) {
    console.log(`Joined guild ${guild.name}`);
    this.scanGuild(guild);
  }

  async handleUserStream(
    user_id: UUID,
    userName: string,
    channel: BaseGuildVoiceChannel,
    audioStream: Readable,
  ) {
    const channelId = channel.id;

    const callback = async (responseAudioStream) => {
      await this.playAudioStream(user_id, responseAudioStream);
    };

    const buffers: Buffer[] = [];
    let totalLength = 0;
    const maxSilenceTime = 500; // Maximum pause duration in milliseconds
    let lastChunkTime = Date.now();

    const monitor = new AudioMonitor(audioStream, 10000000, async (buffer) => {
      const currentTime = Date.now();
      const silenceDuration = currentTime - lastChunkTime;

      buffers.push(buffer);
      totalLength += buffer.length;
      lastChunkTime = currentTime;

      if (silenceDuration > maxSilenceTime || totalLength >= 1000000) {
        const inputBuffer = Buffer.concat(buffers, totalLength);
        buffers.length = 0;
        totalLength = 0;

        try {
          const text = await this.transcriptionService.transcribe(inputBuffer);
          const room_id = getUuid(channelId) as UUID;
          const userIdUUID = getUuid(user_id) as UUID;
          await this.runtime.ensureUserExists(
            this.runtime.agentId,
            this.runtime.character.name,
          );
          await this.runtime.ensureUserExists(userIdUUID, userName);
          await this.runtime.ensureRoomExists(room_id);
          await this.runtime.ensureParticipantInRoom(userIdUUID, room_id);
          await this.runtime.ensureParticipantInRoom(
            this.runtime.agentId,
            room_id,
          );

          const state = await this.runtime.composeState(
            {
              content: { content: text, action: "WAIT", source: "Discord" },
              user_id: userIdUUID,
              room_id,
            },
            {
              discordClient: this.client,
              agentName: this.runtime.character.name,
            },
          );

          if (text && text.startsWith("/")) {
            return null;
          }

          const response = await this.handleVoiceMessage({
            message: {
              content: { content: text, action: "WAIT" },
              user_id: userIdUUID,
              room_id,
            },
            callback: (str: any) => {},
            state,
          });

          const content = (response.responseMessage ||
            response.content ||
            response.message) as string;

          if (!content) {
            return null;
          }

          let responseStream = await this.textToSpeech(content);

          if (responseStream) {
            callback(responseStream as Readable);
          }
        } catch (error) {
          console.error("Error processing audio stream:", error);
        }
      }
    });
  }

  async handleVoiceMessage({
    message,
    shouldIgnore = false,
    shouldRespond = true,
    callback,
    state,
  }: {
    message: Message;
    shouldIgnore?: boolean;
    shouldRespond?: boolean;
    callback: (response: string) => void;
    state?: State;
  }): Promise<Content> {
    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }

    await this._saveRequestMessage(message, state);

    state = await this.runtime.updateRecentMessageState(state);

    if (!shouldIgnore) {
      shouldIgnore = await this._shouldIgnore(message);
    }

    if (shouldIgnore) {
      return { content: "", action: "IGNORE" };
    }

    if (!shouldRespond) {
      return { content: "", action: "IGNORE" };
    }

    let context = composeContext({
      state,
      template: voiceHandlerTemplate,
    });

    const responseContent = await this._generateResponse(
      message,
      state,
      context,
    );

    await this._saveResponseMessage(message, state, responseContent);

    this.runtime
      .processActions(message, responseContent, state)
      .then((response: unknown) => {
        if (response && (response as Content).content) {
          callback((response as Content).content);
        }
      });

    return responseContent;
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

  private async _saveRequestMessage(message: Message, state: State) {
    const { content: senderContent } = message;

    if ((senderContent as Content).content) {
      const senderName =
        state.actorsData?.find((actor: Actor) => actor.id === message.user_id)
          ?.name || "Unknown User";

      const contentWithUser = {
        ...(senderContent as Content),
        user: senderName,
      };

      await this.runtime.messageManager.createMemory({
        user_id: message.user_id,
        content: contentWithUser,
        room_id: message.room_id,
        embedding: embeddingZeroVector,
      });

      await this.runtime.evaluate(message, {
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
      await this.runtime.messageManager.createMemory({
        user_id: this.runtime.agentId,
        content: { ...responseContent, user: this.character.name },
        room_id,
        embedding: embeddingZeroVector,
      });
      await this.runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  }

  private async _shouldIgnore(message: Message): Promise<boolean> {
    // if the message is 3 characters or less, ignore it
    if ((message.content as Content).content.length < 3) {
      return true;
    }

    const loseInterestWords = [
      // telling the bot to stop talking
      "shut up",
      "stop",
      "dont talk",
      "silence",
      "stop talking",
      "be quiet",
      "hush",
      "stfu",
      "stupid bot",
      "dumb bot",

      // offensive words
      "fuck",
      "shit",
      "damn",
      "suck",
      "dick",
      "cock",
      "sex",
      "sexy",
    ];
    if (
      (message.content as Content).content.length < 50 &&
      loseInterestWords.some((word) =>
        (message.content as Content).content.toLowerCase().includes(word),
      )
    ) {
      return true;
    }

    const ignoreWords = ["k", "ok", "bye", "lol", "nm", "uh"];
    if (
      (message.content as Content).content.length < 8 &&
      ignoreWords.some((word) =>
        (message.content as Content).content.toLowerCase().includes(word),
      )
    ) {
      return true;
    }

    return false;
  }

  async scanGuild(guild: Guild) {
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

  async joinChannel(channel: BaseGuildVoiceChannel) {
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
    const errorHandler = (err: any) => {
      console.log(`Opus decoding error: ${err}`);
    };
    const streamCloseHandler = () => {
      console.log(`voice stream from ${member?.displayName} closed`);
      this.streams.delete(user_id);
      this.connections.delete(user_id);
    };
    const closeHandler = () => {
      console.log(`Opus decoder for ${member?.displayName} closed`);
      opusDecoder.removeListener("error", errorHandler);
      opusDecoder.removeListener("close", closeHandler);
      receiveStream?.removeListener("close", streamCloseHandler);
    };
    opusDecoder.on("error", errorHandler);
    opusDecoder.on("close", closeHandler);
    receiveStream?.on("close", streamCloseHandler);

    this.client.emit("userStream", user_id, userName, channel, opusDecoder);
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
        if (newState.status == "idle") {
          const idleTime = Date.now();
          console.log(`Audio playback took: ${idleTime - audioStartTime}ms`);
        }
      },
    );
  }

  async handleJoinChannelCommand(interaction: any) {
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

  async handleLeaveChannelCommand(interaction: any) {
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

  async textToSpeech(text: string): Promise<Readable> {
    // check for elevenlabs API key
    if (process.env.ELEVENLABS_XI_API_KEY) {
      return textToSpeech(text);
    }

    if (!this.speechSynthesizer) {
      this.speechSynthesizer = await SpeechSynthesizer.create("./model.onnx");
    }
    // Synthesize the speech to get a Float32Array of single channel 22050Hz audio data
    const audio = await this.speechSynthesizer.synthesize(text);

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
}
