import { REST } from '@discordjs/rest';
import { NoSubscriberBehavior, StreamType, VoiceConnection, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { SupabaseDatabaseAdapter, BgentRuntime, Content, Message, State, composeContext, defaultActions, embeddingZeroVector, messageHandlerTemplate, parseJSONObjectFromText } from "bgent";
import { UUID } from 'crypto';
import { BaseGuildVoiceChannel, ChannelType, Client, Message as DiscordMessage, Events, GatewayIntentBits, Guild, GuildMember, Partials, Routes } from "discord.js";
import { EventEmitter } from "events";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import { default as getUuid, default as uuid } from 'uuid-by-string';
import { AudioMonitor } from "./audioMonitor.ts";
import elaborate_discord from './elaborate_discord.ts';
import { textToSpeech } from "./elevenlabs.ts";
import settings from "./settings.ts";
import { speechToText } from "./speechtotext.ts";

const supabaseClient = createClient(
    settings.SUPABASE_URL!,
    settings.SUPABASE_API_KEY!,
);

// These values are chosen for compatibility with picovoice components
const DECODE_FRAME_SIZE = 1024;
const DECODE_SAMPLE_RATE = 16000;

type InterestChannels = { [key: string]: { lastMessageSent: number, messages: { userId: UUID, userName: string, content: Content }[] } }

export const shouldRespondTemplate = `
# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are "true" and "false".

{{agentName}} is in a room with other users and wants to be conversational, but not annoying. {{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant. If a message is not interesting or relevant, {{agentName}} should not respond. Unless directly engaging with a user, {{agentName}} should try to avoid responding to messages that are very short or do not contain much information.

{{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to not respond.

{{recentMessages}}

# INSTRUCTIONS: Respond with "true" if {{agentName}} should respond, or "false" if {{agentName}} should not respond.`;

enum ResponseType {
    /**
     * The original spoken audio from the user.
     */
    SPOKEN_AUDIO = 0,
    /**
     * The original spoken audio from the user, converted to text.
     */
    SPOKEN_TEXT = 1,
    /**
     * The response from the AI as text
     */
    RESPONSE_TEXT = 2,
    /**
     * The response from the AI as audio
     */
    RESPONSE_AUDIO = 3
}

const commands = [
    {
        name: 'setname',
        description: 'Change the agent\'s name in the database',
        options: [
            {
                name: 'name',
                description: 'The new name for the agent',
                type: 3, // 3 corresponds to the STRING type
                required: true,
            },
        ],
    },
    {
        name: 'setbio',
        description: 'Change the agent\'s bio in the database',
        options: [
            {
                name: 'bio',
                description: 'The new bio for the agent',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'setavatar',
        description: 'Change the bot\'s server avatar',
        options: [
            {
                name: 'image',
                description: 'The image to set as the bot\'s avatar',
                type: 11, // 11 corresponds to the ATTACHMENT type
                required: true,
            },
        ],
    },
    {
        name: 'joinchannel',
        description: 'Join the voice channel the user is in',
        options: [
            {
                name: 'channel',
                description: 'The voice channel to join',
                type: 7, // 7 corresponds to the CHANNEL type
                required: true,
            }
        ]
    },
    {
        name: 'leavechannel',
        description: 'Leave the voice channel the user is in',
    },
];



const rest = new REST({ version: '9' }).setToken(settings.DISCORD_API_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(settings.DISCORD_APPLICATION_ID!),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

export class DiscordClient extends EventEmitter {
    private apiToken: string;
    private client: Client;
    private streams: Map<string, Readable> = new Map();
    private connections: Map<string, VoiceConnection> = new Map();
    private runtime: BgentRuntime;

    constructor() {
        super();
        this.apiToken = settings.DISCORD_API_TOKEN;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.GuildMessageTyping,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.Message,
            ]
        });

        const supabase = createClient(
            settings.SUPABASE_URL!,
            settings.SUPABASE_API_KEY!,
        )

        this.runtime = new BgentRuntime({
            databaseAdapter: new SupabaseDatabaseAdapter(
                settings.SUPABASE_URL!,
                settings.SUPABASE_API_KEY!,
            ),
            token: settings.OPENAI_API_KEY as string,
            serverUrl: 'https://api.openai.com/v1',
            evaluators: [],
            // filter out the default ELABORATE action
            actions: [...defaultActions.filter(
                action => action.name !== 'ELABORATE'
            ),
            // add the discord specific elaborate action, which has a callback
            elaborate_discord],
        });

        this.client.once(Events.ClientReady, async readyClient => {
            console.log(`Logged in as ${readyClient.user?.tag}`);
            console.log('Use this URL to add the bot to your server:');
            console.log(`https://discord.com/oauth2/authorize?client_id=${readyClient.user?.id}&scope=bot`);
            await this.checkBotAccount();
            await this.onReady();
        });
        this.client.login(this.apiToken);
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            if (newState.member?.user.bot) return;
            if (newState.channelId != null && newState.channelId != oldState.channelId) {
                this.joinChannel(newState.channel as BaseGuildVoiceChannel);
            }
        });
        this.client.on('guildCreate', (guild) => {
            console.log(`Joined guild ${guild.name}`);
            this.scanGuild(guild);
        });
        this.on('userStream', async (userId: UUID, userName: string, channel: BaseGuildVoiceChannel, audioStream: Readable) => {
            const channelId = channel.id;
            const userIdUUID = uuid(userId) as UUID;
            this.listenToSpokenAudio(userIdUUID, userName, channelId, audioStream, async (responseAudioStream) => {
                console.log("Got response audio stream");
                responseAudioStream.on('close', () => {
                    console.log("Response audio stream closed");
                });
                await discordClient.playAudioStream(userId, responseAudioStream);
            }, ResponseType.RESPONSE_AUDIO);
        });

        let lastProcessedMessageId: string | null = null;
        let interestChannels: InterestChannels = {};

        this.client.on(Events.MessageCreate, async (message: DiscordMessage) => {
            console.log("Got message");

            if (message.author?.bot) return;

            // Check if the message has already been processed
            if (message.id === lastProcessedMessageId) {
                console.log("Ignoring duplicate message");
                return;
            }

            lastProcessedMessageId = message.id;

            const userId = message.author.id as UUID;
            const userName = message.author.username;
            const channelId = message.channel.id;
            const textContent = message.content;

            // remove any channels that have not been active for 10 hours
            for (let [channelId, channelData] of Object.entries(interestChannels)) {
                if (Date.now() - channelData.lastMessageSent > 36000000) {
                    delete interestChannels[channelId];
                }
            }

            try {
                // Use your existing function to handle text and get a response
                const responseStream = await this.respondToText({ userId, userName, channelId, input: textContent, requestedResponseType: ResponseType.RESPONSE_TEXT, message, interestChannels });
                if (!responseStream) {
                    console.log("No response stream");
                    return;
                }
                // Convert the Readable stream to text (assuming the response is text)
                let responseData = '';
                for await (const chunk of responseStream) {
                    responseData += chunk;
                }

                // Send the response back to the same channel
                message.channel.send(responseData);
            } catch (error) {
                console.error('Error responding to message:', error);
                message.channel.send('Sorry, I encountered an error while processing your request.');
            }
        });

        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === 'setname') {
                console.log('interaction', interaction);
                const newName = interaction.options.get('name')?.value;
                console.log('**** newName:', newName);

                const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
                const userIdUUID = getUuid(interaction.user.id) as UUID;
                const userName = interaction.user.username;
                const room_id = getUuid(interaction.channelId) as UUID;

                await interaction.deferReply();

                await this.ensureUserExists(supabaseClient, agentId, await this.fetchBotName(settings.DISCORD_API_TOKEN), settings.DISCORD_API_TOKEN);
                await this.ensureUserExists(supabaseClient, userIdUUID, userName);
                await this.ensureRoomExists(supabaseClient, room_id);
                await this.ensureParticipantInRoom(supabaseClient, userIdUUID, room_id);
                await this.ensureParticipantInRoom(supabaseClient, agentId, room_id);

                if (newName) {
                    try {
                        const { error } = await supabaseClient
                            .from('accounts')
                            .update({ name: newName })
                            .eq('id', getUuid(interaction.client.user?.id));

                        if (error) {
                            console.error('Error updating agent name:', error);
                            await interaction.editReply('An error occurred while updating the agent name.');
                            return;
                        }

                        const guild = interaction.guild;
                        if (guild) {
                            const botMember = await guild.members.fetch(interaction.client.user?.id as string);
                            await botMember.setNickname(newName as string);
                        }

                        await interaction.editReply(`Agent's name has been updated to: ${newName}`);
                    } catch (error) {
                        console.error('Error updating agent name:', error);
                        await interaction.editReply('An error occurred while updating the agent name.');
                    }
                } else {
                    await interaction.editReply('Please provide a new name for the agent.');
                }


            } else if (interaction.commandName === 'setbio') {
                const newBio = interaction.options.get('bio')?.value;
                if (newBio) {
                    try {
                        const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
                        const userIdUUID = getUuid(interaction.user.id) as UUID;
                        const userName = interaction.user.username;
                        const room_id = getUuid(interaction.channelId) as UUID;

                        await interaction.deferReply();

                        await this.ensureUserExists(supabaseClient, agentId, await this.fetchBotName(settings.DISCORD_API_TOKEN), settings.DISCORD_API_TOKEN);
                        await this.ensureUserExists(supabaseClient, userIdUUID, userName);
                        await this.ensureRoomExists(supabaseClient, room_id);
                        await this.ensureParticipantInRoom(supabaseClient, userIdUUID, room_id);
                        await this.ensureParticipantInRoom(supabaseClient, agentId, room_id);

                        await supabaseClient
                            .from('accounts')
                            .update({ details: { summary: newBio } })
                            .eq('id', getUuid(interaction.client.user?.id));

                        await interaction.editReply(`Agent's bio has been updated to: ${newBio}`);
                    } catch (error) {
                        console.error('Error updating agent bio:', error);
                        await interaction.editReply('An error occurred while updating the agent bio.');
                    }
                } else {
                    await interaction.reply('Please provide a new bio for the agent.');
                }
                return;
            } else if (interaction.commandName === 'setavatar') {
                const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
                const userIdUUID = getUuid(interaction.user.id) as UUID;
                const userName = interaction.user.username;
                const room_id = getUuid(interaction.channelId) as UUID;

                await interaction.deferReply();

                await this.ensureUserExists(supabaseClient, agentId, await this.fetchBotName(settings.DISCORD_API_TOKEN), settings.DISCORD_API_TOKEN);
                await this.ensureUserExists(supabaseClient, userIdUUID, userName);
                await this.ensureRoomExists(supabaseClient, room_id);
                await this.ensureParticipantInRoom(supabaseClient, userIdUUID, room_id);
                await this.ensureParticipantInRoom(supabaseClient, agentId, room_id);

                const attachment = interaction.options.getAttachment('image');
                if (attachment) {
                    try {
                        const response = await fetch(attachment.url);
                        const buffer = await response.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const dataURI = `data:${attachment.contentType};base64,${base64}`;
                        await interaction.client.user?.setAvatar(dataURI);
                        await interaction.editReply('Bot avatar has been updated.');
                    } catch (error) {
                        console.error('Error updating bot avatar:', error);
                        await interaction.editReply('An error occurred while updating the bot avatar.');
                    }
                } else {
                    await interaction.editReply('Please provide an image attachment to set as the bot avatar.');
                }
                return;
            }
            else if (interaction.commandName === 'joinchannel') {
                const channelId = interaction.options.get('channel')?.value as string;
                const guild = interaction.guild;
                if (!guild) {
                    return;
                }
                const voiceChannel = interaction.guild.channels.cache.find(channel => channel.id === channelId && channel.type === ChannelType.GuildVoice);
            
                if (!voiceChannel) {
                  await interaction.reply('Voice channel not found!');
                  return;
                }
            
                try {
                  joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId as any,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                  });
                  await interaction.reply(`Joined voice channel: ${voiceChannel.name}`);
                } catch (error) {
                  console.error('Error joining voice channel:', error);
                  await interaction.reply('Failed to join the voice channel.');
                }
            }
            else if (interaction.commandName === 'leavechannel') {
                const connection = getVoiceConnection(interaction.guildId as any);
            
                if (!connection) {
                    await interaction.reply('Not currently in a voice channel.');
                    return;
                }
            
                try {
                    connection.destroy();
                    await interaction.reply('Left the voice channel.');
                } catch (error) {
                    console.error('Error leaving voice channel:', error);
                    await interaction.reply('Failed to leave the voice channel.');
                }
            }
        });
    }

    private async checkBotAccount() {
        const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;
        const room_id = getUuid(this.client.user?.id as string) as UUID;

        await this.ensureUserExists(supabaseClient, agentId, await this.fetchBotName(settings.DISCORD_API_TOKEN), settings.DISCORD_API_TOKEN);
        await this.ensureRoomExists(supabaseClient, room_id);
        await this.ensureParticipantInRoom(supabaseClient, agentId, room_id);

        const { data: botData, error: botError } = await supabaseClient
            .from('accounts')
            .select('name')
            .eq('id', agentId)
            .single();

        if (botError) {
            console.error('Error fetching bot account:', botError);
            return;
        }

        if (!botData.name) {
            const botName = await this.fetchBotName(settings.DISCORD_API_TOKEN);
            await supabaseClient
                .from('accounts')
                .update({ name: botName })
                .eq('id', agentId);
        }
    }

    /**
    * Handle an incoming message, processing it and returning a response.
    * @param message The message to handle.
    * @param state The state of the agent.
    * @returns The response to the message.
    */
    async handleMessage(
        message: Message,
        hasInterest = true,
        shouldIgnore = false,
        shouldRespond = true,
        callback: (response: string) => void,
        state?: State,
    ) {
        
        // remove the elaborate action 

        const _saveRequestMessage = async (message: Message, state: State) => {
            const { content: senderContent, /* senderId, userIds, room_id */ } = message

            // we run evaluation here since some evals could be modulo based, and we should run on every message
            if ((senderContent as Content).content) {
                const { data: data2, error } = await supabaseClient.from('messages').select('*').eq('user_id', message.senderId)
                    .eq('room_id', message.room_id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.log('error', error)
                    // TODO: dont need this recall
                } else if (data2.length > 0 && data2[0].content === message.content) {
                    console.log('already saved', data2)
                } else {
                    await this.runtime.messageManager.createMemory({
                        user_ids: [message.senderId, message.agentId, ...message.userIds],
                        user_id: message.senderId!,
                        content: senderContent,
                        room_id: message.room_id,
                        embedding: embeddingZeroVector
                    })
                }
                await this.runtime.evaluate(message, state)
            }
        }

        await _saveRequestMessage(message, state as State)

        console.log("MESSAGE:", message);
        if (shouldIgnore) {
            return { content: '', action: 'IGNORE' };
        }

        state = (await this.runtime.composeState(message)) as State
                
        if (!shouldRespond && hasInterest) {
            console.log('Checking if agent should respond')
            const shouldRespondContext = composeContext({
                state,
                template: shouldRespondTemplate
            })

            console.log(shouldRespondContext)

            const response = await this.runtime.completion({
                context: shouldRespondContext,
                stop: []
            })

            console.log('*** response is', response)

            // check if the response is true or false
            if (response.toLowerCase().includes('true')) {
                console.log("Responding to message");
                shouldRespond = true;
            } else if (response.toLowerCase().includes('false')) {
                console.log("Not responding to message");
                shouldRespond = false;
            } else {
                console.error('Invalid response:', response);
                shouldRespond = false;
            }
        }

        if (!shouldRespond) {
            console.log("Not responding to message");
            return { content: '', action: 'IGNORE' };
        }

        console.log("Responding to message");

        const context = composeContext({
            state,
            template: messageHandlerTemplate
        })

        if (this.runtime.debugMode) {
            console.log(context, 'Response Context')
        }

        let responseContent: Content | null = null
        const { senderId, room_id, userIds: user_ids, agentId } = message

        for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
            console.log('*** RESPONDING:')
            console.log(context)
            const response = await this.runtime.completion({
                context,
                stop: []
            })

            supabaseClient
                .from('logs')
                .insert({
                    body: { message, context, response },
                    user_id: senderId,
                    room_id,
                    user_ids: user_ids!,
                    agent_id: agentId!,
                    type: 'main_completion'
                })
                .then(({ error }) => {
                    if (error) {
                        console.error('error', error)
                    }
                })

            console.log('raw response is', response)

            const parsedResponse = parseJSONObjectFromText(
                response
            ) as unknown as Content

            if (
                (parsedResponse?.user as string)?.includes(
                    (state as State).agentName as string
                )
            ) {
                responseContent = {
                    content: parsedResponse.content,
                    action: parsedResponse.action
                }
                break
            }
        }

        if (!responseContent) {
            responseContent = {
                content: '',
                action: 'IGNORE'
            }
        }

        const _saveResponseMessage = async (
            message: Message,
            state: State,
            responseContent: Content
        ) => {
            const { agentId, userIds, room_id } = message

            responseContent.content = responseContent.content?.trim()

            if (responseContent.content) {
                await this.runtime.messageManager.createMemory({
                    user_ids: userIds!,
                    user_id: agentId!,
                    content: responseContent,
                    room_id,
                    embedding: embeddingZeroVector
                })
                await this.runtime.evaluate(message, { ...state, responseContent })
            } else {
                console.warn('Empty response, skipping')
            }
        }

        await _saveResponseMessage(message, state, responseContent)
        this.runtime.processActions(message, responseContent).then((response: unknown) => {
            if(response && (response as Content).content) {
                callback((response as Content).content)
            }
        })
        console.log('RESPONSE:', responseContent)
        return responseContent
    }

    // Add this function to fetch the bot's name
    async fetchBotName(botToken: string) {
        const url = 'https://discord.com/api/v10/users/@me';

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching bot details: ${response.statusText}`);
        }

        const data = await response.json();
        return data.username; // Or data.tag for username#discriminator
    }

    // Modify this function to include fetching the bot's name if the user is an agent
    async ensureUserExists(
        supabase: SupabaseClient,
        userId: UUID,
        userName: string | null,
        botToken?: string,
    ) {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
        }

        if (data) {
            // console.log('User exists:', data);
        }

        if (!data) {
            // If userName is not provided and botToken is, fetch the bot's name
            if (!userName && botToken) {
                userName = await this.fetchBotName(botToken);
            }

            // User does not exist, so create them
            const { error } = await supabase.from('accounts').insert([
                {
                    id: userId,
                    name: userName || 'Bot',
                    email: (userName || 'Bot') + '@discord',
                    details: { summary: 'I am a bot' },
                },
            ]);

            if (error) {
                console.error('Error creating user:', error);
            } else {
                console.log(`User ${userName} created successfully.`);
            }
        }
    }

    // Function to ensure a room exists
    async ensureRoomExists(supabase: SupabaseClient, roomId: UUID) {
        const { data, error } = await supabase
            .from('rooms') // Replace 'rooms' with your actual rooms table name
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) {
            console.error('Error fetching room:', error);
        }

        if (!data) {
            // Room does not exist, so create it
            const { error } = await supabase
                .from('rooms') // Replace 'rooms' with your actual rooms table name
                .insert([{ id: roomId }]);

            if (error) {
                console.error('Error creating room:', error);
            } else {
                console.log(`Room ${roomId} created successfully.`);
            }
        }
    }

    // Function to ensure a participant is linked to a room
    async ensureParticipantInRoom(
        supabase: SupabaseClient,
        userId: UUID,
        roomId: UUID,
    ) {
        console.log('*** ensureParticipantInRoom', userId, roomId)
        const { data, error } = await supabase
            .from('participants') // Replace 'participants' with your actual participants table name
            .select('*')
            .eq('user_id', userId)
            .eq('room_id', roomId)
            .single();

        if (error) {
            console.error('Error fetching participant:', error);
        }

        if (!data) {
            // Participant does not exist, so link user to room
            const { error } = await supabase
                .from('participants') // Replace 'participants' with your actual participants table name
                .insert([{ user_id: userId, room_id: roomId }]);

            if (error) {
                console.error('Error linking user to room:', error);
            } else {
                console.log(`User ${userId} linked to room ${roomId} successfully.`);
            }
        }
    }

    /**
     * Listens on an audio stream and responds with an audio stream.
     */
    async listenToSpokenAudio(userId: UUID, userName: string, channelId: string, inputStream: Readable, callback: (responseAudioStream: Readable) => void, requestedResponseType?: ResponseType): Promise<void> {
        if (requestedResponseType == null) requestedResponseType = ResponseType.RESPONSE_AUDIO;
        let monitor = new AudioMonitor(inputStream, 1000000, async (buffer) => {
            if (requestedResponseType == ResponseType.SPOKEN_AUDIO) {
                const readable = new Readable({
                    read() {
                        this.push(buffer);
                        this.push(null);
                    }
                });

                callback(readable);
            } else {
                const responseStream = await this.respondToSpokenAudio(userId, userName, channelId, buffer, requestedResponseType);
                if (!responseStream) {
                    return null;
                }
                callback(responseStream);
            }
        });
    }

    /**
    * Responds to an audio stream
    */
    async respondToSpokenAudio(userId: UUID, userName: string, channelId: string, inputBuffer: Buffer, requestedResponseType?: ResponseType): Promise<Readable | null> {
        console.log("Responding to spoken audio");
        if (requestedResponseType == null) requestedResponseType = ResponseType.RESPONSE_AUDIO;
        const sstService = speechToText;
        const text = await sstService(inputBuffer);
        if (requestedResponseType == ResponseType.SPOKEN_TEXT) {
            return Readable.from(text as string);
        } else {
            return await this.respondToText({ userId, userName, channelId, input: text as string, requestedResponseType });
        }
    }


    /**
     * Responds to text
     */
    async respondToText({ userId, userName, channelId, input, requestedResponseType, message, interestChannels }: {
        userId: UUID,
        userName: string,
        channelId: string,
        input: string,
        requestedResponseType?: ResponseType,
        message?: DiscordMessage,
        interestChannels?: InterestChannels
    }): Promise<Readable | null> {

        async function _shouldIgnore(message: DiscordMessage, interestChannels: InterestChannels) {
            if (!interestChannels) {
                throw new Error('Interest channels not provided');
            }
            // exclude common things people would say to make the agent shut up
            const loseInterestWords = ['shut up', 'stop', 'dont talk', 'silence', 'stop talking', 'be quiet', 'hush', 'stfu', 'stupid bot', 'dumb bot']
            // if message content is less than 13 characters and contains any of the ignore words, do not respond
            if (message.content.length < 13 && loseInterestWords.some(word => message.content.toLowerCase().includes(word))) {
                // delete the channel from the interest channels
                delete interestChannels[message.channelId];
                return true;
            }

            const ignoreWords = ['fuck', 'shit', 'damn', 'piss', 'suck', 'dick', 'cock', ' sex', ' sexy']
            if (message.content.length < 15 && ignoreWords.some(word => message.content.toLowerCase().includes(word))) {
                // continue to pay attention, but ignore these
                return true;
            }

            // if the message is less than 7 characters and the agent is not already interested, return false
            if (!interestChannels[message.channelId] && message.content.length < 7) {
                return true;
            }

            // small quips that are veyr short can be ignored
            const ignoreResponseWords = ['lol', 'nm', 'uh']
            if (message.content.length < 4 && ignoreResponseWords.some(word => message.content.toLowerCase().includes(word))) {
                // continue to pay attention, but ignore these
                return true;
            }
            return false;
        }

        async function _shouldRespond(message: DiscordMessage, interestChannels: InterestChannels) {
            if (message.author.id === discordClient.client.user?.id) return false; // do not respond to self
            if (message.author.bot) return false; // Do not respond to other bots
            // if the message includes a ping or the bots name (either uppercase or lowercase), respond
            if (message.mentions.has(discordClient.client.user?.id as string)) return true;

            console.log('discordClient.client.user?.username', discordClient.client.user?.username)
            console.log('discordClient.client.user?.tag', discordClient.client.user?.tag)

            // get the guild member info from the discord Client
            const guild = message.guild;
            const member = guild?.members.cache.get(discordClient.client.user?.id as string);
            const nickname = member?.nickname;
            console.log('nickname', nickname)

            if (message.content.toLowerCase().includes(discordClient.client.user?.username.toLowerCase() as string) ||
                message.content.toLowerCase().includes(discordClient.client.user?.tag.toLowerCase() as string) ||
                (nickname && message.content.toLowerCase().includes(nickname.toLowerCase()))) {
                return true;
            }

            console.log('*** isDM', !message.guild);
            
            // if the message is a DM (not a guild), respond
            if (!message.guild) return true;

            // acknowledgedments that come after an agent message should be evaluated
            const acknowledgementWords = ['ok', 'sure', 'no', 'okay', 'yes', 'maybe', 'why not', 'yeah', 'yup', 'yep', 'ty']
            // check if last message was from the bot
            if (interestChannels[message.channelId] && interestChannels[message.channelId].messages && interestChannels[message.channelId].messages.length > 0 &&
                // last message came from the bot
                interestChannels[message.channelId].messages[interestChannels[message.channelId].messages.length - 1].userId === discordClient.client.user?.id &&
                // last message contains an acknowledgement word
                acknowledgementWords.some(word => interestChannels[message.channelId].messages[interestChannels[message.channelId].messages.length - 1].content.content.toLowerCase().includes(word)) &&
                // last message is less than 6 chars
                interestChannels[message.channelId].messages[interestChannels[message.channelId].messages.length - 1].content.content.length < 6
            ) {
                return true;
            }
            return false;
        }
        
        // if interestChannels contains the channel id, considering responding
        const shouldIgnore = (message && interestChannels) ? await _shouldIgnore(message, interestChannels) : false;
        let hasInterest = (message && interestChannels) ? !!interestChannels[message.channelId] : true;
        let shouldRespond = (message && interestChannels) ? await _shouldRespond(message, interestChannels) : true;

        // if shouldIgnore, delete the channel from interestChannels
        if (shouldIgnore) {
            shouldRespond = false;
            hasInterest = false
            if(interestChannels && message && interestChannels[message?.channelId]){
                delete interestChannels[message?.channelId];
            }
        }

        console.log('***** hasInterest', hasInterest)
        console.log('***** shouldIgnore', shouldIgnore)
        console.log('***** shouldRespond', shouldRespond)

        if (!shouldIgnore && interestChannels) {
            // set interestChannels to include the <channelId>: <timestamp> pair
            interestChannels[channelId] = {
                messages: [...(interestChannels[channelId]?.messages || []), {
                    userId: userId,
                    userName: userName,
                    content: { content: message?.content || '', action: 'WAIT' },
                }], lastMessageSent: Date.now()
            };
        }

        console.log("Responding to text");
        if (requestedResponseType == null) requestedResponseType = ResponseType.RESPONSE_AUDIO;

        const room_id = getUuid(channelId) as UUID;

        const userIdUUID = getUuid(userId) as UUID;

        const agentId = getUuid(settings.DISCORD_APPLICATION_ID as string) as UUID;

        await this.ensureUserExists(supabaseClient, agentId, await this.fetchBotName(settings.DISCORD_API_TOKEN), settings.DISCORD_API_TOKEN);
        await this.ensureUserExists(supabaseClient, userIdUUID, userName);
        await this.ensureRoomExists(supabaseClient, room_id);
        await this.ensureParticipantInRoom(supabaseClient, userIdUUID, room_id);
        await this.ensureParticipantInRoom(supabaseClient, agentId, room_id);

        const callback = (response: string) => {
            // Send the response back to the same channel
            message?.channel.send(response);
        }

        if (input && input.startsWith("/")) {
            return null;
        }

        const response = await this.handleMessage({
            content: { content: input, action: 'WAIT' },
            senderId: userIdUUID,
            agentId,
            userIds: [userIdUUID, agentId],
            room_id,
        },
            hasInterest,
            shouldIgnore,
            shouldRespond,
            callback,
        )

        if (!response.content) {
            return null;
        }

        if (requestedResponseType == ResponseType.RESPONSE_TEXT) {
            return Readable.from(response.content);
        } else {
            return await textToSpeech(response.content);
        }
    }

    private async onReady() {
        const guilds = await this.client.guilds.fetch();
        // Iterate through all guilds
        for (const [guildId, guild] of guilds) {
            const fullGuild = await guild.fetch();
            this.scanGuild(fullGuild);
        }
    }

    private async scanGuild(guild: Guild) {
        // Iterate through all voice channels fetching the largest one with at least one connected member
        const channels = (await guild.channels.fetch())
            .filter(channel => channel?.type == ChannelType.GuildVoice);
        let chosenChannel: BaseGuildVoiceChannel | null = null;

        for (const [id, channel] of channels) {
            const voiceChannel = channel as BaseGuildVoiceChannel;
            if (voiceChannel.members.size > 0 && (chosenChannel === null || voiceChannel.members.size > chosenChannel.members.size)) {
                chosenChannel = voiceChannel;
            }
        }

        if (chosenChannel != null) {
            this.joinChannel(chosenChannel);
        }
    }

    private async joinChannel(channel: BaseGuildVoiceChannel) {
        console.log("joining channel:", channel.name);
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        for (const [id, member] of channel.members) {
            if (member.user.bot) continue;
            this.monitorMember(member, channel);
        }

        connection.receiver.speaking.on('start', (userId) => {
            const user = channel.members.get(userId);
            if (user?.user.bot) return;
            this.monitorMember(user as GuildMember, channel);
            this.streams.get(userId)?.emit('speakingStarted');
        });

        connection.receiver.speaking.on('end', async (userId) => {
            const user = channel.members.get(userId);
            if (user?.user.bot) return;
            this.streams.get(userId)?.emit('speakingStopped');
        });
    }

    private async monitorMember(member: GuildMember, channel: BaseGuildVoiceChannel) {
        const userId = member.id;
        const userName = member.displayName;
        const connection = getVoiceConnection(member.guild.id);
        const receiveStream = connection?.receiver.subscribe(userId, {
            autoDestroy: true,
            emitClose: true
        });
        if (receiveStream && receiveStream.listenerCount('data') > 0) { return; }
        const opusDecoder = new prism.opus.Decoder({
            channels: 1,
            rate: DECODE_SAMPLE_RATE,
            frameSize: DECODE_FRAME_SIZE
        });
        pipeline(receiveStream as any, opusDecoder, (err) => {
            if (err) {
                console.log(`Opus decoding pipeline error: ${err}`);
            }
        });
        this.streams.set(userId, opusDecoder);
        this.connections.set(userId, connection as VoiceConnection);
        opusDecoder.on('error', (err) => {
            console.log(`Opus decoding error: ${err}`);
        });
        opusDecoder.on('close', () => {
            console.log(`Opus decoder for ${member?.displayName} closed`);
        });
        this.emit('userStream', userId, userName, channel, opusDecoder);
        receiveStream && receiveStream.on('close', () => {
            console.log(`voice stream from ${member?.displayName} closed`);
        });
    }

    async playAudioStream(userId: UUID, audioStream: Readable) {
        const connection = this.connections.get(userId);
        if (connection == null) {
            console.log(`No connection for user ${userId}`);
            return;
        }
        let audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        connection.subscribe(audioPlayer);

        const audioStartTime = Date.now();

        /*
        const transformer = new AudioConversionStream({
            inputChannels: 1,
            inputSampleRate: 16000,
            outputChannels: 2,
            outputSampleRate: 48000
        });
        */


        /*
        const transformer = ffmpeg(audioStream)
            .inputFormat('s16le')
            .inputOptions([
                '-ac 1',
                '-ar 16000'
            ])
            .outputFormat('s16le')
            .outputOptions([
                '-ac 2',
                '-ar 48000'
            ]);
        */

        /*
        const transformer = new prism.FFmpeg({
            args: [
                '-f', 's16le',
                '-ar', '16000',
                '-ac', '1',
                '-i', '-',
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2'
            ]
        });

        const transformer = new PassThrough();

        transformer.on('error', (err) => {
            console.log(`Audio conversion error: ${err}`);
        });

        transformer.on('close', () => {
            console.log(`Audio conversion closed`);
        });

        audioStream.pipe(transformer);
        */

        let resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary
        });
        audioPlayer.play(resource);

        audioPlayer.on('error', (err) => {
            console.log(`Audio player error: ${err}`);
        });

        audioPlayer.on('stateChange', (oldState, newState) => {
            console.log("Audio player " + newState.status);
            if (newState.status == 'idle') {
                let idleTime = Date.now();
                console.log(`Audio playback took: ${idleTime - audioStartTime}ms`);
            }
        });
    }
}

const discordClient = new DiscordClient();