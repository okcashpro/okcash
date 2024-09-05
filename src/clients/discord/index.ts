import { REST } from "@discordjs/rest";
import {
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  MessageReaction,
  Partials,
  Routes,
  User,
} from "discord.js";
import { EventEmitter } from "events";
import { stringToUuid } from "../../core/uuid.ts";
import { commands } from "./commands.ts";

import { embeddingZeroVector } from "../../core/memory.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import { MessageManager } from "./messages.ts";
import { VoiceManager } from "./voice.ts";

import joinvoice from "./actions/joinvoice.ts";
import leavevoice from "./actions/leavevoice.ts";

export class DiscordClient extends EventEmitter {
  apiToken: string;
  private client: Client;
  private runtime: AgentRuntime;
  character: any;
  private messageManager: MessageManager;
  private voiceManager: VoiceManager;

  constructor(runtime: AgentRuntime) {
    super();
    this.apiToken = runtime.getSetting("DISCORD_API_TOKEN") as string;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.Reaction,
      ],
    });

    this.runtime = runtime;
    this.voiceManager = new VoiceManager(this);
    this.messageManager = new MessageManager(this, this.voiceManager);

    this.client.once(Events.ClientReady, this.onClientReady.bind(this));
    this.client.login(this.apiToken);

    this.setupEventListeners();
    this.setupCommands();

    this.runtime.registerAction(joinvoice);
    this.runtime.registerAction(leavevoice);
  }

  private setupEventListeners() {
    // When joining to a new server
    this.client.on("guildCreate", this.handleGuildCreate.bind(this));

    this.client.on(
      Events.MessageReactionAdd,
      this.handleReactionAdd.bind(this),
    );
    this.client.on(
      Events.MessageReactionRemove,
      this.handleReactionRemove.bind(this),
    );

    // Handle voice events with the voice manager
    this.client.on(
      "voiceStateUpdate",
      this.voiceManager.handleVoiceStateUpdate.bind(this.voiceManager),
    );
    this.client.on(
      "userStream",
      this.voiceManager.handleUserStream.bind(this.voiceManager),
    );

    // Handle a new message with the message manager
    this.client.on(
      Events.MessageCreate,
      this.messageManager.handleMessage.bind(this.messageManager),
    );

    // Handle a new interaction
    this.client.on(
      Events.InteractionCreate,
      this.handleInteractionCreate.bind(this),
    );
  }

  private setupCommands() {
    const rest = new REST({ version: "9" }).setToken(this.apiToken);
    (async () => {
      try {
        await rest.put(
          Routes.applicationCommands(this.runtime.getSetting("DISCORD_APPLICATION_ID")),
          { body: commands },
        );
      } catch (error) {
        console.error(error);
      }
    })();
  }

  private async onClientReady(readyClient: { user: { tag: any; id: any } }) {
    console.log(`Logged in as ${readyClient.user?.tag}`);
    console.log("Use this URL to add the bot to your server:");
    console.log(
      `https://discord.com/api/oauth2/authorize?client_id=${readyClient.user?.id}&permissions=0&scope=bot%20applications.commands`,
    );
    await this.onReady();
  }

  async handleReactionAdd(reaction: MessageReaction, user: User) {
    console.log("Reaction added");
    // if (user.bot) return;

    let emoji = reaction.emoji.name;
    if (!emoji && reaction.emoji.id) {
      emoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
    }

    // Fetch the full message if it's a partial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        return;
      }
    }

    const messageContent = reaction.message.content;
    const truncatedContent =
      messageContent.length > 100
        ? messageContent.substring(0, 100) + "..."
        : messageContent;

    const reactionMessage = `*<${emoji}>: "${truncatedContent}"*`;

    const roomId = stringToUuid(reaction.message.channel.id);
    const userIdUUID = stringToUuid(user.id);

    // Generate a unique UUID for the reaction
    const reactionUUID = stringToUuid(
      `${reaction.message.id}-${user.id}-${emoji}`,
    );

    // Save the reaction as a message
    await this.runtime.messageManager.createMemory({
      id: reactionUUID, // This is the ID of the reaction message
      userId: userIdUUID,
      content: {
        text: reactionMessage,
        source: "discord",
        inReplyTo: stringToUuid(reaction.message.id), // This is the ID of the original message
      },
      roomId,
      createdAt: new Date(),
      embedding: embeddingZeroVector,
    });
  }

  async handleReactionRemove(reaction: MessageReaction, user: User) {
    console.log("Reaction removed");
    // if (user.bot) return;

    let emoji = reaction.emoji.name;
    if (!emoji && reaction.emoji.id) {
      emoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
    }

    // Fetch the full message if it's a partial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        return;
      }
    }

    const messageContent = reaction.message.content;
    const truncatedContent =
      messageContent.length > 50
        ? messageContent.substring(0, 50) + "..."
        : messageContent;

    const reactionMessage = `*Removed <${emoji} emoji> from: "${truncatedContent}"*`;

    const roomId = stringToUuid(reaction.message.channel.id);
    const userIdUUID = stringToUuid(user.id);

    // Generate a unique UUID for the reaction removal
    const reactionUUID = stringToUuid(
      `${reaction.message.id}-${user.id}-${emoji}-removed`,
    );

    // Save the reaction removal as a message
    await this.runtime.messageManager.createMemory({
      id: reactionUUID, // This is the ID of the reaction removal message
      userId: userIdUUID,
      content: {
        text: reactionMessage,
        source: "discord",
        inReplyTo: stringToUuid(reaction.message.id), // This is the ID of the original message
      },
      roomId,
      createdAt: new Date(),
      embedding: embeddingZeroVector,
    });
  }

  private handleGuildCreate(guild: Guild) {
    console.log(`Joined guild ${guild.name}`);
    this.voiceManager.scanGuild(guild);
  }

  private async handleInteractionCreate(interaction: any) {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      case "joinchannel":
        await this.voiceManager.handleJoinChannelCommand(interaction);
        break;
      case "leavechannel":
        await this.voiceManager.handleLeaveChannelCommand(interaction);
        break;
    }
  }

  private async onReady() {
    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.voiceManager.scanGuild(fullGuild);
    }
  }
}

// Export the DiscordClient class
export default DiscordClient;
