import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { BgentRuntime, Message } from "bgent";
import { UUID } from 'crypto';
import dotenv from "dotenv";
import { Readable } from "stream";
import getUuid from 'uuid-by-string';
import { AudioMonitor } from "./audioMonitor";
import DiscordClient from "./discordClient";
import { textToSpeech } from "./elevenlabs";
import { speechToText } from "./speechtotext";
import { BaseGuildVoiceChannel } from "discord.js";

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

// Add this function to fetch the bot's name
async function fetchBotName(botToken: string) {
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
async function ensureUserExists(
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
        console.log('User exists:', data);
    }

    if (!data) {
        // If userName is not provided and botToken is, fetch the bot's name
        if (!userName && botToken) {
            userName = await fetchBotName(botToken);
        }

        // User does not exist, so create them
        const { error } = await supabase.from('accounts').insert([
            {
                id: userId,
                name: userName,
                email: userName + '@discord',
                register_complete: true,
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
async function ensureRoomExists(supabase: SupabaseClient, roomId: UUID) {
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
async function ensureParticipantInRoom(
    supabase: SupabaseClient,
    userId: UUID,
    roomId: UUID,
) {
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

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_API_KEY!,
)

const discordClient = new DiscordClient();

const runtime = new BgentRuntime({
    supabase,
    token: process.env.OPENAI_API_KEY,
    serverUrl: 'https://api.openai.com/v1',
    evaluators: [],
    actions: [],
});

/**
 * Listens on an audio stream and responds with an audio stream.
 */
async function listenToSpokenAudio(userId: string, userName: string, channelId: string, inputStream: Readable, callback: (responseAudioStream: Readable) => void, requestedResponseType?: ResponseType): Promise<void> {
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
            let responseStream = await respondToSpokenAudio(userId, userName, channelId, buffer, requestedResponseType);
            callback(responseStream);
        }
    });
}

/**
* Responds to an audio stream
*/
async function respondToSpokenAudio(userId: string, userName: string, channelId: string, inputBuffer: Buffer, requestedResponseType?: ResponseType): Promise<Readable> {
    console.log("Responding to spoken audio");
    if (requestedResponseType == null) requestedResponseType = ResponseType.RESPONSE_AUDIO;
    const sstService = speechToText;
    const text = await sstService(inputBuffer);
    if (requestedResponseType == ResponseType.SPOKEN_TEXT) {
        return Readable.from(text);
    } else {
        return await respondToText(userId, userName, channelId, text, requestedResponseType);
    }
}
/**
 * Responds to text
 */
async function respondToText(userId: string, userName: string, channelId: string, input: string, requestedResponseType?: ResponseType): Promise<Readable> {
    console.log("Responding to text");
    if (requestedResponseType == null) requestedResponseType = ResponseType.RESPONSE_AUDIO;

    const room_id = getUuid(channelId) as UUID;

    const userIdUUID = getUuid(userId) as UUID;

    const agentId = getUuid(process.env.DISCORD_APPLICATION_ID) as UUID;

    await ensureUserExists(supabase, agentId, null, process.env.DISCORD_TOKEN);
    await ensureUserExists(supabase, userIdUUID, userName);
    await ensureRoomExists(supabase, room_id);
    await ensureParticipantInRoom(supabase, userIdUUID, room_id);
    await ensureParticipantInRoom(supabase, agentId, room_id);

    const message = {
        content: { content: input },
        senderId: userId,
        agentId,
        userIds: [userId, agentId],
        room_id,
    } as unknown as Message;

    const response = await runtime.handleMessage(message)

    if (requestedResponseType == ResponseType.RESPONSE_TEXT) {
        return Readable.from(response.content);
    } else {
        return await textToSpeech(response.content);
    }
}

discordClient.on('userStream', (userId: string, userName: string, channel: BaseGuildVoiceChannel, audioStream: Readable) => {
    const channelId = channel.id;
    listenToSpokenAudio(userId, userName, channelId, audioStream, async (responseAudioStream) => {
        console.log("Got response audio stream");
        responseAudioStream.on('close', () => {
            console.log("Response audio stream closed");
        });
        await discordClient.playAudioStream(userId, responseAudioStream);
    }, ResponseType.RESPONSE_AUDIO);
});
