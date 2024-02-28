# Ruby - Discord Voice AI Chatbot

Ruby is an AI chatbot integrated with Discord voice channels. The bot is powered by `bgent` and `discord.js`, with elevenlabs and OpenAI Whisper for text-to-speech and speech-to-text services. The bot is designed to be modular and can be easily extended to support other services.

## Configuration
- Get API keys for Discord and Eleven Labs
- Set the appropriate environment variables

## Environment Variables

### General

| Variable Name                         | Values                | Defaults                 | Description                                                                      |
|---------------------------------------|-----------------------|--------------------------|----------------------------------------------------------------------------------|
| DISCORD_API_TOKEN                     | string                | ''                       | Discord bot API token.                                                           |
| ELEVENLABS_XI_API_KEY                 | string                | ''                       | API key for Eleven Labs.                                                         |
| ELEVENLABS_MODEL_ID                   | string                | 'eleven_multilingual_v2' | Model ID for a specific language model in Eleven Labs.                           |
| ELEVENLABS_VOICE_ID                   | string                | '21m00Tcm4TlvDq8ikWAM'   | Voice ID for a specific voice in Eleven Labs. Default is "Rachel".               |
| ELEVENLABS_VOICE_STABILITY            | number                | 0.5                      | Stability parameter for Eleven Labs voice synthesis.                             |
| ELEVENLABS_VOICE_SIMILARITY_BOOST     | number                | 0.9                      | Similarity boost for Eleven Labs voice synthesis.                                |
| ELEVENLABS_VOICE_STYLE                | number                | 0.66                     | Style parameter for Eleven Labs voice synthesis.                                 |
| ELEVENLABS_VOICE_USE_SPEAKER_BOOST    | boolean               | false                    | Whether to use speaker boost in Eleven Labs voice synthesis.                     |
| ELEVENLABS_OPTIMIZE_STREAMING_LATENCY | 0 \| 1 \| 2 \| 3 \| 4 | 4                        | Level of optimization for streaming latency in Eleven Labs.                      |
| ELEVENLABS_OUTPUT_FORMAT              | 'pcm_16000'           | 'pcm_16000'              | Output format for voice synthesis. Currently only pcm_16000 will work properly.  |