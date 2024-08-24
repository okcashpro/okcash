import { getVoiceConnection } from "@discordjs/voice";
import { Message, Provider, State } from "../../../core/types.ts";
import { ChannelType, Message as DiscordMessage } from "discord.js";
import { AgentRuntime } from "../../../core/runtime.ts";

const voiceStateProvider: Provider = {
  get: async (runtime: AgentRuntime, message: Message, state?: State) => {
    const connection = getVoiceConnection(
      (state?.discordMessage as DiscordMessage)?.guild?.id as string,
    );
    const agentName = state?.agentName || "The agent";
    if (!connection) {
      return agentName + " is not currently in a voice channel";
    }

    const channel = (
      state?.discordMessage as DiscordMessage
    )?.guild?.channels.cache.get(connection.joinConfig.channelId as string);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return agentName + " is in an invalid voice channel";
    }

    return `${agentName} is currently in the voice channel: ${channel.name} (ID: ${channel.id})`;
  },
};

export default voiceStateProvider;
