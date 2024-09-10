# Eliza

<img src="./docs/eliza_banner.png" alt="Eliza Banner" width="100%">

A useful AI agent, and a great friend.

- Powerful Discord and Twitter bot with access to the internet
- Voice-to-voice on Discord
- Can read PDFs, transcribe audio and videos, summarize conversations, and more
- Create your own characters or run a copy of Eliza herself
- Highly extensible - create your own actions and clients to extend Eliza's capabilities
- Runs on Mac, Windows, and Linux, or deploy on a light-weight device with OpenAI
- Open source and local with Llama 3 and transformers.js
- Or use OpenAI for cloud inference on a light-weight device
- Fully integrated with Discord and Twitter
- Written in Typescript

# Requires Node 20+
If you are getting strange issues when starting up, make sure you're using Node 20+. Some APIs are not compatible with previous versions. You can check your node version with `node -v`. If you need to install a new version of node, we recommend using [nvm](https://github.com/nvm-sh/nvm).

## Additional Requirements
You may need to install Sharp. If you see an error when starting up, try installing it with the following command:
```
npm install --include=optional sharp
```

# Environment Setup

You will need to add environment variables to your .env file to connect to various platforms:
```
# Required environment variables
# Start Discord
DISCORD_APPLICATION_ID=
DISCORD_API_TOKEN= # Bot token

# Start Twitter
TWITTER_USERNAME= # Account username
TWITTER_PASSWORD= # Account password
TWITTER_EMAIL= # Account email
TWITTER_COOKIES= # Account cookies
```

# Local Setup

## CUDA Setup

If you have an NVIDIA GPU, you can install CUDA to speed up local inference dramatically.
```
npm install
npx --no node-llama-cpp download --gpu cuda
```

Make sure that you've installed the CUDA Toolkit, including cuDNN and cuBLAS.

# Cloud Setup (with OpenAI)

In addition to the environment variables above, you will need to add the following:
```
# OpenAI handles the bulk of the work with chat, TTS, image recognition, etc.
OPENAI_API_KEY=sk-* # OpenAI API key, starting with sk-

# The agent can also ask Claude for help if you have an API key
ANTHROPIC_API_KEY=

# For Elevenlabs voice generation on Discord voice
ELEVENLABS_XI_API_KEY= # API key from elevenlabs

# ELEVENLABS SETINGS
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000
```

For help with setting up your Discord Bot, check out here: https://discordjs.guide/preparations/setting-up-a-bot-application.html
