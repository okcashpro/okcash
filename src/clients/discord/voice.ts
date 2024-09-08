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
import {
  BaseGuildVoiceChannel,
  ChannelType,
  Client,
  Guild,
  GuildMember,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { AudioMonitor } from "./audioMonitor.ts";

import EventEmitter from "events";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import {
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from "../../core/types.ts";
import { stringToUuid } from "../../core/uuid.ts";
import { SpeechService } from "../../services/speech.ts";
import { voiceHandlerTemplate } from "./templates.ts";

// These values are chosen for compatibility with picovoice components
const DECODE_FRAME_SIZE = 1024;
const DECODE_SAMPLE_RATE = 16000;

export class VoiceManager extends EventEmitter {
  private client: Client;
  private runtime: IAgentRuntime;
  private streams: Map<string, Readable> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();

  constructor(client: any) {
    super();
    this.client = client.client;
    this.runtime = client.runtime;
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
    // this.scanGuild(guild);
  }

  async handleUserStream(
    userId: UUID,
    name: string,
    userName: string,
    channel: BaseGuildVoiceChannel,
    audioStream: Readable,
  ) {
    const channelId = channel.id;
    const buffers: Buffer[] = [];
    let totalLength = 0;
    const maxSilenceTime = 500; // Maximum pause duration in milliseconds
    let lastChunkTime = Date.now();

    const monitor = new AudioMonitor(audioStream, 10000000, async (buffer) => {
      const currentTime = Date.now();
      const silenceDuration = currentTime - lastChunkTime;
      if (!buffer) {
      }
      buffers.push(buffer);
      totalLength += buffer.length;
      lastChunkTime = currentTime;

      if (silenceDuration > maxSilenceTime || totalLength >= 1000000) {
        const inputBuffer = Buffer.concat(buffers, totalLength);
        buffers.length = 0;
        totalLength = 0;

        try {
          console.log("transcribing");
          const text =
            await this.runtime.transcriptionService.transcribe(inputBuffer);
          console.log("text: ", text);

          if (!text) return;

          // handle whisper cases
          if (
            (text.length < 15 && text.includes("[BLANK_AUDIO]")) ||
            (text.length < 5 && text.toLowerCase().includes("you"))
          ) {
            return;
          }

          const roomId = stringToUuid(channelId);
          const userIdUUID = stringToUuid(userId);
          await this.runtime.ensureUserExists(
            this.runtime.agentId,
            this.client.user.username,
            this.runtime.character.name,
            "discord",
          );
          await Promise.all([
            this.runtime.ensureUserExists(
              userIdUUID,
              userName,
              name,
              "discord",
            ),
            this.runtime.ensureRoomExists(roomId),
          ]);

          await Promise.all([
            this.runtime.ensureParticipantInRoom(userIdUUID, roomId),
            this.runtime.ensureParticipantInRoom(this.runtime.agentId, roomId),
          ]);

          let state = await this.runtime.composeState(
            {
              content: { text: text, source: "Discord" },
              userId: userIdUUID,
              roomId,
            },
            {
              discordChannel: channel,
              discordClient: this.client,
              agentName: this.runtime.character.name,
            },
          );

          if (text && text.startsWith("/")) {
            return null;
          }

          const memory = {
            id: stringToUuid(channelId + "-voice-message-" + Date.now()),
            content: { text: text, source: "discord", url: channel.url },
            userId: userIdUUID,
            roomId,
            embedding: embeddingZeroVector,
            createdAt: Date.now(),
          };

          if (!memory.content.text) {
            return { text: "", action: "IGNORE" };
          }

          await this.runtime.messageManager.createMemory(memory);

          state = await this.runtime.updateRecentMessageState(state);

          // this is a little gross after refactoring
          let shouldIgnore = await this._shouldIgnore(memory);

          if (shouldIgnore) {
            return { text: "", action: "IGNORE" };
          }

          let context = composeContext({
            state,
            template: voiceHandlerTemplate,
          });

          const responseContent = await this._generateResponse(
            memory,
            state,
            context,
          );
          const callback: HandlerCallback = async (content: Content) => {
            console.log("callback content: ", content);
            const { roomId } = memory;

            const responseMemory: Memory = {
              id: stringToUuid(memory.id + "-voice-response-" + Date.now()),
              userId: this.runtime.agentId,
              content: {
                ...content,
                user: this.runtime.character.name,
                inReplyTo: memory.id,
              },
              roomId,
              embedding: embeddingZeroVector,
            };

            if (responseMemory.content.text?.trim()) {
              await this.runtime.messageManager.createMemory(responseMemory);
              state = await this.runtime.updateRecentMessageState(state);
              let responseStream = await SpeechService.generate(
                this.runtime,
                content.text,
              );

              if (responseStream) {
                await this.playAudioStream(userId, responseStream as Readable);
              }
              await this.runtime.evaluate(memory, state);
            } else {
              console.warn("Empty response, skipping");
            }
            return [responseMemory];
          };

          const responseMemories = await callback(responseContent);

          const response = responseContent;

          const content = (response.responseMessage ||
            response.content ||
            response.message) as string;

          if (!content) {
            return null;
          }

          console.log("responseMemories: ", responseMemories);

          await this.runtime.processActions(
            memory,
            responseMemories,
            state,
            callback,
          );
        } catch (error) {
          console.error("Error processing audio stream:", error);
        }
      }
    });
  }

  private async _generateResponse(
    message: Memory,
    state: State,
    context: string,
  ): Promise<Content> {
    const { userId, roomId } = message;

    const datestr = new Date().toUTCString().replace(/:/g, "-");

    // log context to file
    log_to_file(`${state.agentName}_${datestr}_generate_context`, context);

    const response = await this.runtime.messageCompletion({
      context,
      stop: [],
    });

    response.source = "discord";

    if (!response) {
      console.error("No response from runtime.messageCompletion");
      return;
    }

    log_to_file(
      `${state.agentName}_${datestr}_generate_response`,
      JSON.stringify(response),
    );

    await this.runtime.databaseAdapter.log({
      body: { message, context, response },
      userId: userId,
      roomId,
      type: "response",
    });

    return response;
  }

  private async _shouldIgnore(message: Memory): Promise<boolean> {
    console.log("message: ", message);
    console.log("message.content: ", message.content);
    // if the message is 3 characters or less, ignore it
    if ((message.content as Content).text.length < 3) {
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
      (message.content as Content).text.length < 50 &&
      loseInterestWords.some((word) =>
        (message.content as Content).text?.toLowerCase().includes(word),
      )
    ) {
      return true;
    }

    const ignoreWords = ["k", "ok", "bye", "lol", "nm", "uh"];
    if (
      (message.content as Content).text?.length < 8 &&
      ignoreWords.some((word) =>
        (message.content as Content).text?.toLowerCase().includes(word),
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
      // if (member.user.bot) continue;
      this.monitorMember(member, channel);
    }

    connection.receiver.speaking.on("start", (userId: string) => {
      const user = channel.members.get(userId);
      // if (user?.user.bot) return;
      this.monitorMember(user as GuildMember, channel);
      this.streams.get(userId)?.emit("speakingStarted");
    });

    connection.receiver.speaking.on("end", async (userId: string) => {
      const user = channel.members.get(userId);
      // if (user?.user.bot) return;
      this.streams.get(userId)?.emit("speakingStopped");
    });
  }

  private async monitorMember(
    member: GuildMember,
    channel: BaseGuildVoiceChannel,
  ) {
    const userId = member.id;
    const userName = member.user.username;
    const name = member.user.displayName;
    const connection = getVoiceConnection(member.guild.id);
    const receiveStream = connection?.receiver.subscribe(userId, {
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
    this.streams.set(userId, opusDecoder);
    this.connections.set(userId, connection as VoiceConnection);
    opusDecoder.on("error", (err: any) => {
      console.log(`Opus decoding error: ${err}`);
    });
    const errorHandler = (err: any) => {
      console.log(`Opus decoding error: ${err}`);
    };
    const streamCloseHandler = () => {
      console.log(`voice stream from ${member?.displayName} closed`);
      this.streams.delete(userId);
      this.connections.delete(userId);
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

    this.client.emit(
      "userStream",
      userId,
      name,
      userName,
      channel,
      opusDecoder,
    );
  }

  async playAudioStream(userId: UUID, audioStream: Readable) {
    const connection = this.connections.get(userId);
    if (connection == null) {
      console.log(`No connection for user ${userId}`);
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
}
