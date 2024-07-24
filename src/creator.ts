console.log("ok")

import { TwitterGenerationClient } from './clients/twitter/generate.ts';
import { TwitterSearchClient } from './clients/twitter/search.ts';
import { TwitterInteractionClient } from './clients/twitter/interactions.ts';
import { DiscordClient } from './clients/discord/index.ts';
import { Agent } from './core/agent.ts';
import fs from "fs";
import yargs from "yargs";

console.log("Making it thi far")

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

function startTwitter() {
    const twitterInteractionClient = new TwitterInteractionClient(agent, character);
    const twitterSearchClient = new TwitterSearchClient(agent, character);
    const twitterGenerationClient = new TwitterGenerationClient(agent, character);
}

// if (argv.discord || (!argv.twitter && !argv.discord)) {
//     startDiscord();
// }
// if (argv.twitter || (!argv.twitter && !argv.discord)) {
//     startTwitter();
// }