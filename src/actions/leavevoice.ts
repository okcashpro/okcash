// src/actions/leaveVoice
import { getVoiceConnection } from "@discordjs/voice";
import {
  Channel,
  ChannelType,
  Client,
  Message as DiscordMessage,
} from "discord.js";
import { AgentRuntime } from "../core/runtime.ts";
import { Message, State, Action } from "../core/types.ts";

export default {
  name: "LEAVE_VOICE",
  validate: async (runtime: AgentRuntime, message: Message, state: State) => {
    if (!state) {
      throw new Error("State is not available.");
    }

    if (!state.discordMessage) {
      return; // discordMessage isn't available in voice channels
    }

    if (!state.discordClient) {
      throw new Error("Discord client is not available in the state.");
    }

    const keywords = [
      "leave",
      "exit",
      "stop",
      "quit",
      "get off",
      "get out",
      "bye",
      "cya",
      "see you",
      "hop off",
      "get off",
      "voice",
      "vc",
      "chat",
      "call",
      "meeting",
      "discussion",
    ];
    if (
      !keywords.some((keyword) =>
        message.content.content.toLowerCase().includes(keyword),
      )
    ) {
      return false;
    }

    const client = state.discordClient as Client;

    // Check if the client is connected to any voice channel
    const isConnectedToVoice = client.voice.adapters.size > 0;

    return isConnectedToVoice;
  },
  description: "Leave the current voice channel.",
  handler: async (
    runtime: AgentRuntime,
    message: Message,
    state: State,
  ): Promise<boolean> => {
    if (!state.discordClient) {
      throw new Error("Discord client is not available in the state.");
    }
    if (!state.discordMessage) {
      throw new Error("Discord message is not available in the state.");
    }
    const voiceChannels = (state.discordClient as Client)?.guilds.cache
      .get((state.discordMessage as DiscordMessage).guild?.id as string)
      ?.channels.cache.filter(
        (channel: Channel) => channel.type === ChannelType.GuildVoice,
      );

    voiceChannels?.forEach((channel: Channel) => {
      const connection = getVoiceConnection(
        (state.discordMessage as DiscordMessage).guild?.id as string,
      );
      if (connection) {
        connection.destroy();
      }
    });
    return true;
  },
  condition: "The agent wants to or has been asked to leave the current voice channel.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{user2}} please leave the voice channel",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sure",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "I have to go now but thanks for the chat",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "You too, talk to you later",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Great call everyone, hopping off now",
            action: "LEAVE_VOICE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Agreed, I'll hop off too",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Hey {{user2}} I need you to step away from the voice chat for a bit",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "No worries, I'll leave the voice channel",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{user2}}, I think we covered everything, you can leave the voice chat now",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Sounds good, see you both later",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "leave voice {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "ok leaving",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "plz leave the voice chat {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "aight im out",
          action: "LEAVE_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "yo {{user2}} gtfo the vc",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "sorry, talk to you later",
          action: "LEAVE_VOICE",
        },
      },
    ],
  ],
} as Action;
