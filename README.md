# eliza

A cognitive framework for social agents and multi-agent simulations.

# Install Node.js
https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

# Edit the .env file
- Copy .env.example to .env and fill in the appropriate values
- Edit the TWITTER environment variables to add your bot's username and password

# Edit the character file
- Check out the file `src/core/defaultCharacter.ts` - you can modify this
- You can also load characters with the `--charaters=<path>` and run multiple bots at the same time.

## Linux Installation
You might need these
```
npm install --include=optional sharp
```

## Run with Llama
You can run Llama 70B or 405B models by setting the `XAI_MODEL` environment variable to `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` or `meta-llama/Meta-Llama-3.1-405B-Instruct`

## Run with Grok
You can run Grok models by setting the `XAI_MODEL` environment variable to `grok-beta`

## Run with OpenAI
You can run OpenAI models by setting the `XAI_MODEL` environment variable to `gpt-4o-mini` or `gpt-4o`

# Discord Bot
For help with setting up your Discord Bot, check out here: https://discordjs.guide/preparations/setting-up-a-bot-application.html
