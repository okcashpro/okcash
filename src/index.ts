import Database from "better-sqlite3";
import fs from "fs";
import yargs from "yargs";
import askClaude from "./actions/ask_claude.ts";
import follow_room from "./actions/follow_room.ts";
import mute_room from "./actions/mute_room.ts";
import unfollow_room from "./actions/unfollow_room.ts";
import unmute_room from "./actions/unmute_room.ts";
import { SqliteDatabaseAdapter } from "./adapters/sqlite.ts";
import { DiscordClient } from "./clients/discord/index.ts";
import { TwitterSearchClient } from "./clients/twitter/search.ts";
import DirectClient from "./clients/direct/index.ts";
import { defaultActions } from "./core/actions.ts";
import defaultCharacter from "./core/defaultCharacter.ts";
import { AgentRuntime } from "./core/runtime.ts";
import settings from "./core/settings.ts";
import { Character } from "./core/types.ts";
import boredomProvider from "./providers/boredom.ts";
import timeProvider from "./providers/time.ts";
import walletProvider from "./providers/wallet.ts";
import { TwitterInteractionClient } from "./clients/twitter/interactions.ts";
import { TwitterGenerationClient } from "./clients/twitter/generate.ts";
import { wait } from "./clients/twitter/utils.ts";

interface Arguments {
  character?: string;
  characters?: string;
  twitter?: boolean;
  discord?: boolean;
}

let argv: Arguments = {
  character: "./src/agent/default_character.json",
  characters: "",
};

try {
  // Parse command line arguments
  argv = yargs(process.argv)
    .option("character", {
      type: "string",
      description: "Path to the character JSON file",
    })
    .option("characters", {
      type: "string",
      description: "Comma separated list of paths to character JSON files",
    })
    .parseSync() as Arguments;
} catch (error) {
  console.log("Error parsing arguments:");
  console.log(error);
}

// Load character
const characterPath = argv.character || argv.characters;

console.log("characterPath", characterPath);

const characterPaths = argv.characters?.split(",").map((path) => path.trim());

console.log("characterPaths", characterPaths);

const characters = [];

const directClient = new DirectClient();
directClient.start(3000);

if (characterPaths?.length > 0) {
  for (const path of characterPaths) {
    try {
      const character = JSON.parse(fs.readFileSync(path, "utf8"));
      console.log("character", character.name);
      characters.push(character);
    } catch (e) {
      console.log(`Error loading character from ${path}: ${e}`);
    }
  }
}

try {
  if (characterPath) {
    const character = JSON.parse(fs.readFileSync(characterPath, "utf8"));
    characters.push(character);
  }
} catch (e) {
  console.log(`Error loading character from ${characterPath}: ${e}`);
}

async function startAgent(character: Character) {
  console.log("Starting agent for character " + character.name);
  const db = new SqliteDatabaseAdapter(new Database("./db.sqlite"))
  const runtime = new AgentRuntime({
    databaseAdapter: db,
    token:
      character.settings?.secrets?.OPENAI_API_KEY ??
      (settings.OPENAI_API_KEY as string),
    serverUrl: "https://api.openai.com/v1",
    embeddingModel: character.settings?.embeddingModel || "text-embedding-3-small",
    model: "gpt-4o-mini",
    evaluators: [],
    character,
    providers: [timeProvider, boredomProvider, walletProvider],
    actions: [
      ...defaultActions,
      askClaude,
      follow_room,
      unfollow_room,
      unmute_room,
      // mute_room,
    ],
  });

  const directRuntime = new AgentRuntime({
    databaseAdapter: db,
    token:
      character.settings?.secrets?.OPENAI_API_KEY ??
      (settings.OPENAI_API_KEY as string),
    serverUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
    evaluators: [],
    character,
    providers: [timeProvider, boredomProvider],
    actions: [
      ...defaultActions,
    ],
  });

  function startDiscord(runtime) {
    const discordClient = new DiscordClient(runtime);
    return discordClient;
  }

  async function startTwitter(runtime) {
    console.log("Starting search client");
    const twitterSearchClient = new TwitterSearchClient(runtime);
    await wait();
    console.log("Starting interaction client");
    const twitterInteractionClient = new TwitterInteractionClient(runtime);
    await wait();
    console.log("Starting generation client");
    const twitterGenerationClient = new TwitterGenerationClient(runtime);

    return {
      twitterInteractionClient,
      twitterSearchClient,
      twitterGenerationClient,
    };
  }

  if (!character.clients) {
    return console.error("No clients found for character " + character.name);
  }

  const clients = [];

  if (character.clients.map((str) => str.toLowerCase()).includes("discord")) {
    const discordClient = startDiscord(runtime);
    clients.push(discordClient);
  }

  if (character.clients.map((str) => str.toLowerCase()).includes("twitter")) {
    const {
      twitterInteractionClient,
      twitterSearchClient,
      twitterGenerationClient,
    } = await startTwitter(runtime);
    clients.push(
      twitterInteractionClient, twitterSearchClient, twitterGenerationClient,
    );
  }

  directClient.registerAgent(directRuntime);

  return clients;
}

const startAgents = async () => {
  if (characters.length === 0) {
    console.log("No characters found, using default character");
    characters.push(defaultCharacter);
  }
  for (const character of characters) {
    await startAgent(character);
  }
};

startAgents();

// way for user input to quit
const stdin = process.stdin;

stdin.resume();
stdin.setEncoding("utf8");

console.log("Press Ctrl+C to quit");
