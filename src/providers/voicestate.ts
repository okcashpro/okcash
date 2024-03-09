// src/providers/voiceStateProvider.ts
import { BgentRuntime, Message, Provider, State } from "bgent";
import { ChannelType, Message as DiscordMessage } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Channel } from "diagnostics_channel";

const voiceStateProvider: Provider = {
  get: async (runtime: BgentRuntime, message: Message, state?: State) => {
    const connection = getVoiceConnection((state?.discordMessage as DiscordMessage)?.guild?.id as string);
    if (!connection) {
      return "The agent is not currently in a voice channel.";
    }

    const channel = (state?.discordMessage as DiscordMessage)?.guild?.channels.cache.get(connection.joinConfig.channelId as string);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return "The agent is in an invalid voice channel.";
    }

    return `The agent is currently in the voice channel: ${channel.name} (ID: ${channel.id})`;
  },
};

export default voiceStateProvider;