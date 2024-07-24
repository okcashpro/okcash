console.log("ok")

import { TwitterGenerationClient } from './clients/twitter/generate.ts';
import { TwitterSearchClient } from './clients/twitter/search.ts';
import { TwitterInteractionClient } from './clients/twitter/interactions.ts';
import { DiscordClient } from './clients/discord/index.ts';
import { Agent } from './core/agent.ts';
import fs from "fs";
import yargs from "yargs";

interface Arguments {
    character?: string;
    twitter?: boolean;
    discord?: boolean;
}

let argv: Arguments = {
    character: "./src/default_character.json",
    twitter: false,
    discord: false
};

try {
    // Parse command line arguments
    argv = yargs(process.argv)
        .option('character', {
            type: 'string',
            description: 'Path to the character JSON file'
        })
        .option('twitter', {
            type: 'boolean',
            description: 'Start only the Twitter client'
        })
        .option('discord', {
            type: 'boolean',
            description: 'Start only the Discord client'
        })
        .parseSync() as Arguments;
} catch (error) {
    console.log("Error parsing arguments:");
    console.log(error);
}

// Load character
const characterPath = argv.character || "./src/default_character.json";
console.log("Character path", characterPath)
const character = fs.existsSync(characterPath) ? JSON.parse(fs.readFileSync(characterPath, "utf8")) : { bio: "" };

console.log("Character is", character)

const agent = new Agent();

function startDiscord() {
    console.log("character")
    const discordClient = new DiscordClient(agent, character.bio);
}

// check if character has a 'model' field, if so use that, otherwise use 'gpt-4o-mini'
const model = character.model || 'gpt-4o-mini';

function startTwitter() {
    const twitterInteractionClient = new TwitterInteractionClient(agent, character, model);
    const twitterSearchClient = new TwitterSearchClient(agent, character, model);
    const twitterGenerationClient = new TwitterGenerationClient(agent, character, model);
}

// if (argv.discord || (!argv.twitter && !argv.discord)) {
//     startDiscord();
// }
// if (argv.twitter || (!argv.twitter && !argv.discord)) {
//     startTwitter();
// }