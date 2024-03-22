// src/lib/actions/leaveVoice.ts
import { getVoiceConnection } from "@discordjs/voice";
import { State, type Action, type BgentRuntime, type Message } from "bgent";
import { Channel, ChannelType, Client, Message as DiscordMessage } from "discord.js";

export default {
  name: "LEAVE_VOICE",
  validate: async (runtime: BgentRuntime, message: Message, state: State) => {
    if (!state) {
      throw new Error("State is not available.");
    }

    if (!state.discordMessage) {
      return; // discordMessage isn't available in voice channels
    }
  
    if (!state.discordClient) {
      throw new Error("Discord client is not available in the state.");
    }
  
    const client = state.discordClient as Client;
  
    // Check if the client is connected to any voice channel
    const isConnectedToVoice = client.voice.adapters.size > 0;
  
    return isConnectedToVoice;
  },  
  description: "Leave the current voice channel.",
  handler: async (runtime: BgentRuntime, message: Message, state: State): Promise<boolean> => {
    if (!state.discordClient) {
      throw new Error("Discord client is not available in the state.");
    }
    if (!state.discordMessage) {
      throw new Error("Discord message is not available in the state.");
    }
    const voiceChannels = (state.discordClient as Client)?.guilds.cache
      .get((state.discordMessage as DiscordMessage).guild?.id as string)
      ?.channels.cache.filter((channel: Channel) => channel.type === ChannelType.GuildVoice);

    voiceChannels?.forEach((channel: Channel) => {
      const connection = getVoiceConnection((state.discordMessage as DiscordMessage).guild?.id as string);
      if (connection) {
        connection.destroy();
      }
    });
    return true;
  },
  condition: "The agent wants to leave the current voice channel.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{user2}}, leave the voice channel.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sure.",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}}, I have to go now. Thanks for the voice chat!",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "No problem! I'll leave the voice channel too. Talk to you later!",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Great discussion everyone! Let's wrap up this voice meeting.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Agreed. I'll leave the voice channel now. Thanks for the productive meeting!",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{user2}}, I need to step away from the voice chat for a bit.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "No worries! I'll leave the voice channel too. Just let me know when you're back.",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}}, I think we covered everything we needed to discuss. Ready to leave the voice channel?",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Yes, I think we're done here. Leaving the voice channel now. Good job everyone!",
          action: "LEAVE_VOICE",
        },
      },
    ],
  ],
} as Action;