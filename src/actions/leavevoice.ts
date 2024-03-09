// src/lib/actions/leaveVoice.ts
import { type BgentRuntime, type Action, type Message } from "bgent";
import { getVoiceConnection } from "@discordjs/voice";

export default {
  name: "LEAVE_VOICE",
  validate: async (_runtime: BgentRuntime, message: Message) => {
    const connection = getVoiceConnection(message.guild.id);
    return !!connection;
  },
  description: "Leave the current voice channel.",
  handler: async (runtime: BgentRuntime, message: Message): Promise<boolean> => {
    const connection = getVoiceConnection(message.guild.id);

    if (!connection) {
      console.warn("Not currently in a voice channel.");
      return false;
    }

    try {
      connection.destroy();
      console.log("Left the voice channel.");
      return true;
    } catch (error) {
      console.error("Error leaving voice channel:", error);
      return false;
    }
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



