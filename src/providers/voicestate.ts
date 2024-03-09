// src/providers/voiceStateProvider.ts
import { BgentRuntime, Message, Provider } from "bgent";
import { getVoiceConnection } from "@discordjs/voice";

const voiceStateProvider: Provider = {
  get: async (runtime: BgentRuntime, message: Message) => {
    const connection = getVoiceConnection(message.guild.id);
    if (!connection) {
      return "The agent is not currently in a voice channel.";
    }

    const channel = message.guild.channels.cache.get(connection.joinConfig.channelId);
    if (!channel || channel.type !== "GUILD_VOICE") {
      return "The agent is in an invalid voice channel.";
    }

    return `The agent is currently in the voice channel: ${channel.name} (ID: ${channel.id})`;
  },
};

export default voiceStateProvider;