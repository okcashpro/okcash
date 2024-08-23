import { REST } from "@discordjs/rest";
import {
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  Partials,
  Routes,
} from "discord.js";
import { EventEmitter } from "events";
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../../agent/index.ts";
import { adapter } from "../../agent/db.ts";
import settings from "../../core/settings.ts";
import { commands } from "./commands.ts";

import { MessageManager } from "./messages.ts";
import { VoiceManager } from "./voice.ts";

export class DiscordClient extends EventEmitter {
  apiToken: string;
  private client: Client;
  private agent: Agent;
  character: any;
  private messageManager: MessageManager;
  private voiceManager: VoiceManager;

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
    this.messageManager = new MessageManager(
      this,
      this.client,
      this.agent,
      this.character,
    );
    this.voiceManager = new VoiceManager(
      this.client,
      agent,
      this.messageManager,
      this.character,
    );

    this.client.once(Events.ClientReady, this.onClientReady.bind(this));
    this.client.login(this.apiToken);

    this.setupEventListeners();
    this.setupCommands();
  }

  private setupEventListeners() {
    // When joining to a new server
    this.client.on("guildCreate", this.handleGuildCreate.bind(this));

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
          Routes.applicationCommands(settings.DISCORD_APPLICATION_ID!),
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
      `https://discord.com/oauth2/authorize?client_id=${readyClient.user?.id}&scope=bot`,
    );
    await this.onReady();
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
    await this.messageManager.onReady();

    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.voiceManager.scanGuild(fullGuild);
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
}

// Export the DiscordClient class
export default DiscordClient;
