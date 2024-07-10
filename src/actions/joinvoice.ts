// src/lib/actions/joinVoice.ts
import { joinVoiceChannel } from "@discordjs/voice";
import { State, type Action, type BgentRuntime, type Message, composeContext, parseJSONObjectFromText } from "bgent";
import { Channel, ChannelType, Client, Message as DiscordMessage, Guild, GuildMember } from "discord.js";

export default {
  name: "JOIN_VOICE",
  validate: async (_runtime: BgentRuntime, message: Message, state: State) => {
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


    const client = state.discordClient as Client;

    // Check if the client is connected to any voice channel
    const isConnectedToVoice = client.voice.adapters.size === 0;

    return isConnectedToVoice;
  },
  description: "Join a voice channel to participate in voice chat.",
  handler: async (runtime: BgentRuntime, message: Message, state: State): Promise<boolean> => {
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
    const voiceChannels = (client.guilds.cache.get(id) as Guild)
      .channels.cache.filter((channel: Channel) => channel.type === ChannelType.GuildVoice);

    const channelName = (state.discordMessage as DiscordMessage).content.toLowerCase();
    const targetChannel = voiceChannels.find((channel) => {
      const name = (channel as { name: string }).name.toLowerCase();

      // remove all non-alphanumeric characters (keep spaces between words)
      const replacedName = name.replace(/[^a-z0-9 ]/g, '');

      return name.includes(channelName) || channelName.includes(name) || replacedName.includes(channelName) || channelName.includes(replacedName);
    }
    );

    if (targetChannel) {
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: (state.discordMessage as DiscordMessage).guild?.id as string,
        adapterCreator: (client.guilds.cache.get(id) as Guild).voiceAdapterCreator,
      });
      return true;
    } else {
      const member = (state.discordMessage as DiscordMessage).member as GuildMember;
      if (member.voice.channel) {
        joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: (state.discordMessage as DiscordMessage).guild?.id as string,
          adapterCreator: (client.guilds.cache.get(id) as Guild).voiceAdapterCreator,
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
`

      const guessState = {
        userMessage: message.content.content,
        voiceChannels: voiceChannels.map((channel) => (channel as { name: string }).name).join("\n"),
      }

      const context = composeContext({ template: messageTemplate, state: guessState as unknown as State });

      let responseContent;

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        const response = await runtime.completion({
          context,
        });

        runtime.databaseAdapter.log({
          body: { message, context, response },
          user_id: message.user_id,
          room_id: message.room_id,
          type: "elaborate",
        });
        if (response.trim()) {
          responseContent = response.trim();
          break;
        }
      }

      if (responseContent) {
        // join the voice channel
        const channelName = responseContent.toLowerCase();

        const targetChannel = voiceChannels.find((channel) => {
          const name = (channel as { name: string }).name.toLowerCase();

          // remove all non-alphanumeric characters (keep spaces between words)
          const replacedName = name.replace(/[^a-z0-9 ]/g, '');

          return name.includes(channelName) || channelName.includes(name) || replacedName.includes(channelName) || channelName.includes(replacedName)
        });

        if (targetChannel) {
          joinVoiceChannel({
            channelId: targetChannel.id,
            guildId: (state.discordMessage as DiscordMessage).guild?.id as string,
            adapterCreator: (client.guilds.cache.get(id) as Guild).voiceAdapterCreator,
          });
          return true;
        }
      }

      await (state.discordMessage as DiscordMessage).reply("I couldn't figure out which channel you wanted me to join.");
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
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sure! I'm joining the voice channel now.",
          action: "JOIN_VOICE",
        },
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}}, can you join the voice channel? I want to discuss our game strategy.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Absolutely! I'll join right now.",
          action: "JOIN_VOICE"
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
          action: "JOIN_VOICE"
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
          content: "Oh, exciting! I'm joining the channel. Can't wait to hear it!",
          action: "JOIN_VOICE"
        },
      },
    ],
  ],
} as Action;