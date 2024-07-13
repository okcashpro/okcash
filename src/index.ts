import { Agent } from './agent.ts';
import { DiscordClient } from './clients/discord.ts';
import { TwitterClient } from './clients/twitter.ts';
import { bio } from './lore.ts';

const agent = new Agent();
const twitterClient = new TwitterClient(agent, bio);
// const discordClient = new DiscordClient(agent, bio);