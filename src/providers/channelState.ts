// src/providers/channelStateProvider.ts
import { BgentRuntime, Message, Provider, State } from "bgent";
import { ChannelType, Message as DiscordMessage, TextChannel } from "discord.js";

const channelStateProvider: Provider = {
  get: async (runtime: BgentRuntime, message: Message, state?: State) => {
    const discordMessage = state?.discordMessage as DiscordMessage;
    const guild = discordMessage?.guild;

    if (!guild) {
      return "The agent is currently in a direct message conversation";
    }

    const serverName = guild.name; // The name of the server
    const guildId = guild.id; // The ID of the guild
    const channel = discordMessage.channel;

    let topic = "No topic";
    if (channel.type === ChannelType.GuildText) { // Check if the channel is a text channel
      topic = (channel as TextChannel).topic || "No topic";
    }

    return {
      serverName,
      guildId,
      topic
    };
  },
};

export default channelStateProvider;