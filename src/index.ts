import { TwitterGenerationClient } from './clients/twitter/generate.ts';
import { TwitterSearchClient } from './clients/twitter/search.ts';
import { TwitterInteractionClient } from './clients/twitter/interactions.ts';
import { DiscordClient } from './clients/discord/index.ts';
import { Agent } from './core/agent.ts';
import fs from "fs";

const character = fs.existsSync("./characters/ruby.json") ? JSON.parse(fs.readFileSync("./characters/ruby.json", "utf8")) : "";
const agent = new Agent();
const twitterInteractionClient = new TwitterInteractionClient(agent, character)
// const twitterSearchClient = new TwitterSearchClient(agent, character);
// const twitterGenerationClient = new TwitterGenerationClient(agent, character);
const discordClient = new DiscordClient(agent, character);