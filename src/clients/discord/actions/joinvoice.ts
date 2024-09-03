// src/actions/joinVoice
import { joinVoiceChannel } from "@discordjs/voice";
import {
  Channel,
  ChannelType,
  Client,
  Message as DiscordMessage,
  Guild,
  GuildMember,
} from "discord.js";
import { composeContext } from "../../../core/context.ts";
import { log_to_file } from "../../../core/logger.ts";
import {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../../../core/types.ts";

export default {
  name: "JOIN_VOICE",
  validate: async (_runtime: IAgentRuntime, message: Memory, state: State) => {
    if (!state) {
      throw new Error("State is not available.");
    }

    if (!state.discordMessage) {
      return; // discordMessage isn't available in voice channels
    }

    if (!state.discordClient) {
      console.error("Discord client is not available in the state.");
      throw new Error("Discord client is not available in the state.");
    }

    // did they say something about joining a voice channel? if not, don't validate
    const keywords = [
      "join",
      "come to",
      "come on",
      "enter",
      "voice",
      "chat",
      "talk",
      "call",
      "hop on",
      "get on",
      "vc",
      "meeting",
      "discussion",
    ];
    if (
      !keywords.some((keyword) =>
        message.content.text.toLowerCase().includes(keyword),
      )
    ) {
      return false;
    }

    const client = state.discordClient as Client;

    // Check if the client is connected to any voice channel
    const isConnectedToVoice = client.voice.adapters.size === 0;

    return isConnectedToVoice;
  },
  description: "Join a voice channel to participate in voice chat.",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
  ): Promise<boolean> => {
    if (!state) {
      console.error("State is not available.");
    }

    if (!state.discordClient) {
      throw new Error("Discord client is not available in the state.");
    }
    if (!state.discordMessage) {
      throw new Error("Discord message is not available in the state.");
    }

    const id = (state?.discordMessage as DiscordMessage).guild?.id as string;
    const client = state.discordClient as Client;
    const voiceChannels = (
      client.guilds.cache.get(id) as Guild
    ).channels.cache.filter(
      (channel: Channel) => channel.type === ChannelType.GuildVoice,
    );

    const channelName = (
      state.discordMessage as DiscordMessage
    ).content.toLowerCase();
    const targetChannel = voiceChannels.find((channel) => {
      const name = (channel as { name: string }).name.toLowerCase();

      // remove all non-alphanumeric characters (keep spaces between words)
      const replacedName = name.replace(/[^a-z0-9 ]/g, "");

      return (
        name.includes(channelName) ||
        channelName.includes(name) ||
        replacedName.includes(channelName) ||
        channelName.includes(replacedName)
      );
    });

    if (targetChannel) {
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: (state.discordMessage as DiscordMessage).guild?.id as string,
        adapterCreator: (client.guilds.cache.get(id) as Guild)
          .voiceAdapterCreator,
      });
      return true;
    } else {
      const member = (state.discordMessage as DiscordMessage)
        .member as GuildMember;
      if (member.voice.channel) {
        joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: (state.discordMessage as DiscordMessage).guild?.id as string,
          adapterCreator: (client.guilds.cache.get(id) as Guild)
            .voiceAdapterCreator,
        });
        return true;
      }

      // LLM parse to make an informed decision
      // TODO: Get all of the voice channels for this guild as a list

      const messageTemplate = `
The user has requested to join a voice channel.
Here is the list of channels available in the server:
{{voiceChannels}}

Here is the user's request:
{{userMessage}}

Please respond with the name of the voice channel which the bot should join. Try to infer what channel the user is talking about. If the user didn't specify a voice channel, respond with "none".
You should only respond with the name of the voice channel or none, no commentary or additional information should be included.
`;

      const guessState = {
        userMessage: message.content.text,
        voiceChannels: voiceChannels
          .map((channel) => (channel as { name: string }).name)
          .join("\n"),
      };

      const context = composeContext({
        template: messageTemplate,
        state: guessState as unknown as State,
      });

      const datestr = new Date().toISOString().replace(/:/g, "-");

      // log context to file
      log_to_file(`${state.agentName}_${datestr}_joinvoice_context`, context);

      const responseContent = await runtime.completion({
        context,
      });

      // log response to file
      log_to_file(
        `${state.agentName}_${datestr}_joinvoice_response`,
        responseContent,
      );

      runtime.databaseAdapter.log({
        body: { message, context, response: responseContent },
        userId: message.userId,
        roomId: message.roomId,
        type: "joinvoice",
      });

      if (responseContent && responseContent.trim().length > 0) {
        // join the voice channel
        const channelName = responseContent.toLowerCase();

        const targetChannel = voiceChannels.find((channel) => {
          const name = (channel as { name: string }).name.toLowerCase();

          // remove all non-alphanumeric characters (keep spaces between words)
          const replacedName = name.replace(/[^a-z0-9 ]/g, "");

          return (
            name.includes(channelName) ||
            channelName.includes(name) ||
            replacedName.includes(channelName) ||
            channelName.includes(replacedName)
          );
        });

        if (targetChannel) {
          joinVoiceChannel({
            channelId: targetChannel.id,
            guildId: (state.discordMessage as DiscordMessage).guild
              ?.id as string,
            adapterCreator: (client.guilds.cache.get(id) as Guild)
              .voiceAdapterCreator,
          });
          return true;
        }
      }

      await (state.discordMessage as DiscordMessage).reply(
        "I couldn't figure out which channel you wanted me to join.",
      );
      return false;
    }
  },
  condition:
    "The agent wants to or has been asked to join a voice channel to participate in voice chat.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey, let's jump into the 'General' voice and chat",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sounds good",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{user2}}, can you join the vc, I want to discuss our strat",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure I'll join right now",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "hey {{user2}}, we're having a team meeting in the 'conference' voice channel, plz join us",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "OK see you there",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{user2}}, let's have a quick voice chat in the 'Lounge' channel.",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "kk be there in a sec",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Hey {{user2}}, can you join me in the 'Music' voice channel",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "join voice chat with us {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "coming",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hop in vc {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "joining now",
          action: "JOIN_VOICE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "get in vc with us {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "im in",
          action: "JOIN_VOICE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
