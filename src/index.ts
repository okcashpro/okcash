import { Agent } from './core/agent.ts';
import { DiscordClient } from './clients/discord/index.ts';
import { TwitterClient } from './clients/twitter/index.ts';
import { bio } from './lore.ts';

const agent = new Agent();
const twitterClient = new TwitterClient(agent, bio);
// const discordClient = new DiscordClient(agent, bio);