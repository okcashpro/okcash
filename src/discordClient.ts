import { NoSubscriberBehavior, StreamType, VoiceConnection, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { BaseGuildVoiceChannel, ChannelType, Client, GatewayIntentBits, Guild, GuildMember } from "discord.js";
import { EventEmitter } from "events";
import prism from "prism-media";
import { Readable, pipeline } from "stream";
import settings from "./settings.ts";

// These values are chosen for compatibility with picovoice components
const DECODE_FRAME_SIZE = 1024;
const DECODE_SAMPLE_RATE = 16000;

export default interface DiscordClient {
    /**
     * Fired when a user starts speaking
     * Outputs a PCM stream at 16kHz 1 channel
     */
    on(event: 'userStream', listener: (userId: string, userName: string, channel: BaseGuildVoiceChannel, audioStream: Readable) => void): this;
}

export default class DiscordClient extends EventEmitter {
    private apiToken: string;
    private client: Client;

    private streams: Map<string, Readable> = new Map();
    private connections: Map<string, VoiceConnection> = new Map();

    constructor() {
        super();
        this.apiToken = settings.DISCORD_API_TOKEN;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
        });

        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
            console.log('Use this URL to add the bot to your server:');
            console.log(`https://discord.com/oauth2/authorize?client_id=${this.client.user?.id}&scope=bot`);
            this.onReady();
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

    async playAudioStream(userId: string, audioStream: Readable) {
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

