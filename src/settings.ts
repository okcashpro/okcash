import dotenv from 'dotenv';

dotenv.config();

interface Settings {
    DISCORD_APPLICATION_ID: string;
    DISCORD_API_TOKEN: string;
    DISCORD_IGNORED_CHANNEL_IDS: string[];

    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
    // OPENAI_WHISPER_PROMPT: string;

    SUPABASE_URL: string;
    SUPABASE_API_KEY: string;

    // https://elevenlabs.io/docs/api-reference/streaming
    ELEVENLABS_XI_API_KEY: string;
    ELEVENLABS_MODEL_ID: string;
    ELEVENLABS_VOICE_ID: string;
    ELEVENLABS_VOICE_STABILITY: number;
    ELEVENLABS_VOICE_SIMILARITY_BOOST: number;
    ELEVENLABS_VOICE_STYLE: number;
    ELEVENLABS_VOICE_USE_SPEAKER_BOOST: boolean;
    ELEVENLABS_OPTIMIZE_STREAMING_LATENCY: 0 | 1 | 2 | 3 | 4;
    ELEVENLABS_OUTPUT_FORMAT: 'mp3_44100_128' | 'mp3_44100_96' | 'mp3_44100_128' | 'mp3_44100_192' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'ulaw_8000';
}

let settings: Settings = {
    DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID || '',
    DISCORD_API_TOKEN: process.env.DISCORD_API_TOKEN || '',
    DISCORD_IGNORED_CHANNEL_IDS: (process.env.DISCORD_IGNORED_CHANNEL_IDS || '').split(','),

    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-1106',
    // OPENAI_WHISPER_PROMPT: 'Hello, Ruby.',

    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_API_KEY: process.env.SUPABASE_API_KEY || '',

    ELEVENLABS_XI_API_KEY: process.env.ELEVENLABS_XI_API_KEY || '',
    ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // "Rachel" from their default voices
    ELEVENLABS_VOICE_STABILITY: parseFloat(process.env.ELEVENLABS_VOICE_STABILITY || '0.5'),
    ELEVENLABS_VOICE_SIMILARITY_BOOST: parseFloat(process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || '0.9'),
    ELEVENLABS_VOICE_STYLE: parseFloat(process.env.ELEVENLABS_VOICE_STYLE || '0.66'),
    ELEVENLABS_VOICE_USE_SPEAKER_BOOST: process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST === 'true',
    ELEVENLABS_OPTIMIZE_STREAMING_LATENCY: parseInt(process.env.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY || '4') as 0 | 1 | 2 | 3 | 4,
    ELEVENLABS_OUTPUT_FORMAT: (process.env.ELEVENLABS_OUTPUT_FORMAT || 'pcm_16000') as 'mp3_44100_128' | 'mp3_44100_96' | 'mp3_44100_128' | 'mp3_44100_192' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'ulaw_8000',
};

// import from env
for (const key in settings) {
    if (process.env[key]) {
        if (key === 'DISCORD_IGNORED_CHANNEL_IDS') {
            settings[key] = process.env[key]!.split(',');
        } else {
            // @ts-expect-error - we know this key exists
            settings[key] = process.env[key]!;
        }
    }
}

export default settings;
