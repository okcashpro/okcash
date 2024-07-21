import { DiscordClient } from './clients/discord/index.ts';
import { Agent } from './core/agent.ts';
import fs from "fs";

const character = fs.existsSync("./characters/ruby.json") ? JSON.parse(fs.readFileSync("./characters/ruby.json", "utf8")) : "";
const agent = new Agent();
const discordClient = new DiscordClient(agent, character.bio);