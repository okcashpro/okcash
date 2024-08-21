import {
  ChannelType,
  Message as DiscordMessage,
  TextChannel,
} from "discord.js";
import { AgentRuntime } from "../runtime.ts"
import {
  Message,
  Provider,
  State,
} from "../types.ts"

const channelStateProvider: Provider = {
  get: async (runtime: AgentRuntime, message: Message, state?: State) => {
    const discordMessage = state?.discordMessage as DiscordMessage;
    const guild = discordMessage?.guild;
    const agentName = state?.agentName || "The agent";
    const senderName = state?.senderName || "someone";

    if (!guild) {
      return (
        agentName +
        " is currently in a direct message conversation with " +
        senderName
      );
    }

    const serverName = guild.name; // The name of the server
    const guildId = guild.id; // The ID of the guild
    const channel = discordMessage.channel;

    const topic = "No topic";

    let response =
      agentName +
      " is currently currently viewing in the channel `" +
      channel +
      "` (ID: " +
      channel.id +
      ")" +
      " in the server `" +
      serverName +
      "` (ID: " +
      guildId +
      ")";
    if (channel.type === ChannelType.GuildText) {
      // Check if the channel is a text channel
      response +=
        "\nThe topic of the channel is: " + (channel as TextChannel).topic;
    }
    return response;
  },
};

export default channelStateProvider;
