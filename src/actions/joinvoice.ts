// src/lib/actions/joinVoice.ts
import { type BgentRuntime, type Action, type Message } from "bgent";
import { joinVoiceChannel } from "@discordjs/voice";

export default {
  name: "JOIN_VOICE",
  validate: async (_runtime: BgentRuntime, message: Message) => {
    const channelName = (message.content as { channel: string }).channel;
    const voiceChannel = message.guild.channels.cache.find(
      (channel: { name: string; type: string; }) =>
        channel.name === channelName && channel.type === "GUILD_VOICE"
    );
    return !!voiceChannel;
  },
  description: "Join a voice channel to participate in voice chat.",
  handler: async (runtime: BgentRuntime, message: Message): Promise<boolean> => {
    const channelName = (message.content as { channel: string }).channel;
    const voiceChannel = message.guild.channels.cache.find(
      (channel: { name: string; type: string; }) =>
        channel.name === channelName && channel.type === "GUILD_VOICE"
    );

    if (!voiceChannel) {
      console.warn("Voice channel not found!");
      return false;
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      console.log(`Joined voice channel: ${voiceChannel.name}`);
      return true;
    } catch (error) {
      console.error("Error joining voice channel:", error);
      return false;
    }
  },
  condition: "The agent wants to join a voice channel to participate in voice chat.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey, let's jump into the 'General' voice channel and chat!",
          action: "JOIN_VOICE",
          channel: "General",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}}, can you join the 'Gaming' voice channel? I want to discuss our game strategy.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Absolutely! I'll join right now.",
          action: "JOIN_VOICE",
          channel: "Gaming",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{user2}}, we're having a team meeting in the 'Conference' voice channel. Can you join us?",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sure thing! I'll be right there.",
          action: "JOIN_VOICE",
          channel: "Conference",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}}, let's have a quick voice chat in the 'Lounge' channel.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sounds good! Joining the 'Lounge' channel now.",
          action: "JOIN_VOICE",
          channel: "Lounge",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Hey {{user2}}, can you join me in the 'Music' voice channel? I want to share a new song with you.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Oh, exciting! I'm joining the 'Music' channel. Can't wait to hear it!",
          action: "JOIN_VOICE",
          channel: "Music",
        },
      },
    ],
  ],
} as Action;