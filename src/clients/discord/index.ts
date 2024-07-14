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
import { File } from "formdata-node";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { default as getUuid, default as uuid } from "uuid-by-string";
import { Agent } from '../../core/agent.ts';
import { openAI } from "../openai/index.ts";
import { AudioMonitor } from "./audioMonitor.ts";
import { adapter } from "../../core/db.ts";
import { textToSpeech } from "../elevenlabs/index.ts";
import settings from "../../core/settings.ts";
import { getWavHeader } from "../../core/util.ts";
import { InterestChannels, ResponseType } from "./types.ts";
import { commands } from "./commands.ts";
import { shouldRespondTemplate } from "./prompts.ts";

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

    this.client.once(
      Events.ClientReady,
      async (readyClient: { user: { tag: any; id: any } }) => {
        console.log(`Logged in as ${readyClient.user?.tag}`);
        console.log("Use this URL to add the bot to your server:");
        console.log(
          `https://discord.com/oauth2/authorize?client_id=${readyClient.user?.id}&scope=bot`
        );
        await this.checkBotAccount();
        await this.onReady();
      }
    );
    this.client.login(this.apiToken);
    this.client.on(
      "voiceStateUpdate",
      (oldState: VoiceState | null, newState: VoiceState | null) => {
        if (newState?.member?.user.bot) return;
        if (
          newState?.channelId != null &&
          newState?.channelId != oldState?.channelId
        ) {
          this.joinChannel(newState.channel as BaseGuildVoiceChannel);
        }
      }
    );
    this.client.on("guildCreate", (guild: Guild) => {
      console.log(`Joined guild ${guild.name}`);
      this.scanGuild(guild);
    });
    this.client.on(
      "userStream",
      async (
        user_id: UUID,
        userName: string,
        channel: BaseGuildVoiceChannel,
        audioStream: Readable
      ) => {
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
    );

    let lastProcessedMessageId: string | null = null;
    let interestChannels: InterestChannels = {};

    this.client.on(Events.MessageCreate, async (message: DiscordMessage) => {
      if (message.interaction) return;

      if (message.author?.bot) return;

      if (message.id === lastProcessedMessageId) {
        console.log("Ignoring duplicate message");
        return;
      }

      lastProcessedMessageId = message.id;

      const user_id = message.author.id as UUID;
      const userName = message.author.username;
      const channelId = message.channel.id;
      const textContent = message.content;

      for (let [channelId, channelData] of Object.entries(interestChannels)) {
        if (Date.now() - channelData.lastMessageSent > 36000000) {
          delete interestChannels[channelId];
        }
      }

      try {
        const responseStream = await this.respondToText({
          user_id,
          userName,
          channelId,
          input: textContent,
          requestedResponseType: ResponseType.RESPONSE_TEXT,
          message,
          interestChannels,
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
        message.channel.send(
          "Sorry, I encountered an error while processing your request."
        );
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isCommand()) return;
      if (interaction.commandName === "setname") {
        const newName = interaction.options.get("name")?.value;

        const agentId = getUuid(
          settings.DISCORD_APPLICATION_ID as string
        ) as UUID;
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
      } else if (interaction.commandName === "setbio") {
        const newBio = interaction.options.get("bio")?.value;
        if (newBio) {
          try {
            const agentId = getUuid(
              settings.DISCORD_APPLICATION_ID as string
            ) as UUID;
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
        return;
      } else if (interaction.commandName === "joinchannel") {
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
      } else if (interaction.commandName === "leavechannel") {
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
    });

    if (this.bio) {
      adapter.db
        .prepare("UPDATE accounts SET details = ? WHERE id = ?")
        .run(
          JSON.stringify({ summary: this.bio }),
          getUuid(this.client.user?.id as string)
        );
    }

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

  async speechToText(buffer: Buffer) {
    var wavHeader = getWavHeader(buffer.length, 16000);

    const file = new File([wavHeader, buffer], "audio.wav", {
      type: "audio/wav",
    });

    console.log("Transcribing audio... key", settings.OPENAI_API_KEY);
    var result = (await openAI.audio.transcriptions.create(
      {
        model: "whisper-1",
        language: "en",
        response_format: "text",
        file: file,
      },
      {
        headers: {
          Authentication: `Bearer ${settings.OPENAI_API_KEY}`,
        },
      }
    )) as any as string;
    result = result.trim();
    if (result == null || result.length < 5) {
      return null;
    }
    return result;
  }

  private async ensureUserExists(agentId, userName, botToken = null) {
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
          discordMessage,
          discordClient,
        });
      }
    };

    await _saveRequestMessage(message, state as State);

    if (shouldIgnore) {
      console.log("shouldIgnore", shouldIgnore);
      return { content: "", action: "IGNORE" };
    }

    const nickname = this.client.user?.displayName;
    state = await this.agent.runtime.composeState(message, {
      discordClient,
      discordMessage,
      agentName: nickname || "Ruby",
    });

    if (!shouldRespond && hasInterest) {
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
        if (interestChannels) delete interestChannels[discordMessage.channelId];
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

        if (requestedResponseType == ResponseType.SPOKEN_AUDIO) {
          const readable = new Readable({
            read() {
              this.push(combinedBuffer);
              this.push(null);
            },
          });

          callback(readable);
        } else {
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
    async function _shouldIgnore(
      message: DiscordMessage,
      interestChannels: InterestChannels
    ) {
      if (!interestChannels) {
        throw new Error("Interest channels not provided");
      }
      const loseInterestWords = [
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
      ];
      if (
        message.content.length < 13 &&
        loseInterestWords.some((word) =>
          message.content.toLowerCase().includes(word)
        )
      ) {
        delete interestChannels[message.channelId];
        return true;
      }

      const ignoreWords = [
        "fuck",
        "shit",
        "damn",
        "piss",
        "suck",
        "dick",
        "cock",
        " sex",
        " sexy",
      ];
      if (
        message.content.length < 15 &&
        ignoreWords.some((word) => message.content.toLowerCase().includes(word))
      ) {
        return true;
      }

      if (!interestChannels[message.channelId] && message.content.length < 7) {
        return true;
      }

      const ignoreResponseWords = ["lol", "nm", "uh"];
      if (
        message.content.length < 4 &&
        ignoreResponseWords.some((word) =>
          message.content.toLowerCase().includes(word)
        )
      ) {
        return true;
      }
      return false;
    }

    async function _shouldRespond(
      message: DiscordMessage,
      interestChannels: InterestChannels
    ) {
      if (message.author.id === discordClient.user?.id) return false;
      if (message.author.bot) return false;
      if (message.mentions.has(discordClient.user?.id as string)) return true;

      const guild = message.guild;
      const member = guild?.members.cache.get(discordClient.user?.id as string);
      const nickname = member?.nickname;

      if (
        message.content
          .toLowerCase()
          .includes(discordClient.user?.username.toLowerCase() as string) ||
        message.content
          .toLowerCase()
          .includes(discordClient.user?.tag.toLowerCase() as string) ||
        (nickname &&
          message.content.toLowerCase().includes(nickname.toLowerCase()))
      ) {
        return true;
      }

      if (!message.guild) return true;

      const acknowledgementWords = [
        "ok",
        "sure",
        "no",
        "okay",
        "yes",
        "maybe",
        "why not",
        "yeah",
        "yup",
        "yep",
        "ty",
      ];
      if (
        interestChannels[message.channelId] &&
        interestChannels[message.channelId].messages &&
        interestChannels[message.channelId].messages.length > 0 &&
        interestChannels[message.channelId].messages[
          interestChannels[message.channelId].messages.length - 1
        ].user_id === discordClient.user?.id &&
        acknowledgementWords.some((word) =>
          interestChannels[message.channelId].messages[
            interestChannels[message.channelId].messages.length - 1
          ].content.content
            .toLowerCase()
            .includes(word)
        ) &&
        interestChannels[message.channelId].messages[
          interestChannels[message.channelId].messages.length - 1
        ].content.content.length < 6
      ) {
        return true;
      }
      return false;
    }

    const shouldIgnore =
      message && interestChannels
        ? await _shouldIgnore(message, interestChannels)
        : false;
    let hasInterest =
      message && interestChannels
        ? !!interestChannels[message.channelId]
        : true;
    let shouldRespond =
      message && interestChannels
        ? await _shouldRespond(message, interestChannels)
        : true;

    if (shouldIgnore) {
      shouldRespond = false;
      hasInterest = false;
      if (interestChannels && message && interestChannels[message?.channelId]) {
        delete interestChannels[message?.channelId];
      }
    }

    if (!shouldIgnore && interestChannels) {
      interestChannels[channelId] = {
        messages: [
          ...(interestChannels[channelId]?.messages || []),
          {
            user_id: user_id,
            userName: userName,
            content: { content: message?.content || "", action: "WAIT" },
          },
        ],
        lastMessageSent: Date.now(),
      };
    }

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
      hasInterest,
      shouldIgnore,
      shouldRespond,
      callback,
      interestChannels,
      discordClient: this.client,
      discordMessage: discordMessage as DiscordMessage,
    });

    if (!response.content) {
      return null;
    }

    if (requestedResponseType == ResponseType.RESPONSE_TEXT) {
      return Readable.from(response.content);
    } else {
      return await textToSpeech(response.content);
    }
  }

  private async onReady() {
    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.scanGuild(fullGuild);
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
}
