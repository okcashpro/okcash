import dotenv from 'dotenv';

interface Settings {
    DISCORD_API_TOKEN: string;

    STREAM_ASSISTANT_TO_TTS: boolean;
    STREAM_TTS_OUTPUT: boolean;

    SENSITIVITY: string;

    OPENAI_KEY: string;
    OPENAI_MODEL: string;
    OPENAI_WHISPER_PROMPT: string;

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
    DISCORD_API_TOKEN: '',

    STREAM_ASSISTANT_TO_TTS: false, // Usually streaming is faster, sometimes much slower, probably depending on openAI's service load
    STREAM_TTS_OUTPUT: false, // Sometimes this leads to stuttering / cut out audio if the service isn't fast enough to convert live audio (elevenlabs)

    OPENAI_KEY: '',
    OPENAI_MODEL: 'gpt-3.5-turbo-1106',
    OPENAI_WHISPER_PROMPT: 'Hello, Ruby.',

    SENSITIVITY: '1',

    ELEVENLABS_XI_API_KEY: '',
    ELEVENLABS_MODEL_ID: 'eleven_multilingual_v2',
    ELEVENLABS_VOICE_ID: '21m00Tcm4TlvDq8ikWAM', // "Rachel" from their default voices
    ELEVENLABS_VOICE_STABILITY: 0.5,
    ELEVENLABS_VOICE_SIMILARITY_BOOST: 0.9,
    ELEVENLABS_VOICE_STYLE: 0.66,
    ELEVENLABS_VOICE_USE_SPEAKER_BOOST: false,
    ELEVENLABS_OPTIMIZE_STREAMING_LATENCY: 4,
    ELEVENLABS_OUTPUT_FORMAT: 'pcm_16000',
};


dotenv.config();

// import from env
for (const key in settings) {
    if (process.env[key]) {
        settings[key] = process.env[key]!;
    }
}

export default settings;
