// Exports
export * from "./actions/index.ts";
export * from "./clients/index.ts";
export * from "./adapters/index.ts";
export * from "./providers/index.ts";

import * as Action from "./actions/index.ts";
import * as Client from "./clients/index.ts";
import * as Adapter from "./adapters/index.ts";
import * as Provider from "./providers/index.ts";

import Database from "better-sqlite3";
import fs from "fs";
import yargs from "yargs";

import { wait } from "./clients/twitter/utils.ts";
import { defaultActions } from "./core/actions.ts";
import defaultCharacter from "./core/defaultCharacter.ts";
import { AgentRuntime } from "./core/runtime.ts";
import settings from "./core/settings.ts";
import { Character, IAgentRuntime, ModelProvider } from "./core/types.ts"; // Added IAgentRuntime

import readline from "readline";

interface Arguments {
    character?: string;
    characters?: string;
    //twitter?: boolean;
    discord?: boolean;
    telegram?: boolean; // Added telegram option
}

let argv: Arguments = {
    character: "./src/agent/default_character.json",
    characters: "",
};

try {
    // Parse command line arguments
    argv = yargs(process.argv.slice(2))
        .option("character", {
            type: "string",
            description: "Path to the character JSON file",
        })
        .option("characters", {
            type: "string",
            description:
                "Comma separated list of paths to character JSON files",
        })
        .option("telegram", {
            type: "boolean",
            description: "Enable Telegram client",
            default: false,
        })
        .parseSync() as Arguments;
} catch (error) {
    console.log("Error parsing arguments:");
    console.log(error);
}

// Load character
const characterPath = argv.character || argv.characters;

const characterPaths = argv.characters?.split(",").map((path) => path.trim());

const characters = [];

const directClient = new Client.DirectClient();
directClient.start(3000);

if (characterPaths?.length > 0) {
    for (const path of characterPaths) {
        try {
            const character = JSON.parse(fs.readFileSync(path, "utf8"));
            characters.push(character);
        } catch (e) {
            console.log(`Error loading character from ${path}: ${e}`);
        }
    }
}

function getTokenForProvider(provider: ModelProvider, character: Character) {
    switch (provider) {
        case ModelProvider.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                (settings.OPENAI_API_KEY as string)
            );
        case ModelProvider.ANTHROPIC:
            return (
                character.settings?.secrets?.CLAUDE_API_KEY ||
                (settings.CLAUDE_API_KEY as string)
            );
    }
}

async function startAgent(character: Character) {
    console.log("Starting agent for character " + character.name);
    const token = getTokenForProvider(character.modelProvider, character);

    let db;
    if (process.env.POSTGRES_URL) {
        // const db = new SqliteDatabaseAdapter(new Database("./db.sqlite"));
        db = new Adapter.PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
        });
    } else {
        db = new Adapter.SqliteDatabaseAdapter(new Database("./db.sqlite"));
        // Debug adapter
        // const loggingDb = createLoggingDatabaseAdapter(db);
    }

    const runtime = new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        providers: [
            Provider.timeProvider,
            Provider.boredomProvider,
            Provider.walletProvider,
        ],
        actions: [
            ...defaultActions,
            Action.askClaude,
            Action.followRoom,
            Action.unfollowRoom,
            Action.unmuteRoom,
            Action.muteRoom,
            Action.imageGeneration,
            Action.executeSwap,
        ],
    });

    const directRuntime = new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        providers: [
            Provider.timeProvider,
            Provider.boredomProvider,
            Provider.walletProvider,
            Provider.orderBookProvider,
            Provider.tokenProvider,
        ],
        actions: [...defaultActions],
    });

    function startDiscord(runtime: IAgentRuntime) {
        const discordClient = new Client.DiscordClient(runtime);
        return discordClient;
    }

    async function startTelegram(runtime: IAgentRuntime, character: Character) {
        console.log("🔍 Attempting to start Telegram bot...");

        const botToken = runtime.getSetting("TELEGRAM_BOT_TOKEN");

        if (!botToken) {
            console.error(
                `❌ Telegram bot token is not set for character ${character.name}.`
            );
            return null;
        }

        console.log("✅ Bot token found, initializing Telegram client...");

        try {
            console.log("Creating new TelegramClient instance...");
            const telegramClient = new Client.TelegramClient(runtime, botToken);

            console.log("Calling start() on TelegramClient...");
            await telegramClient.start();

            console.log(
                `✅ Telegram client successfully started for character ${character.name}`
            );
            return telegramClient;
        } catch (error) {
            console.error(
                `❌ Error creating/starting Telegram client for ${character.name}:`,
                error
            );
            return null;
        }
    }

    async function startTwitter(runtime) {
        console.log("Starting search client");
        const twitterSearchClient = new Client.TwitterSearchClient(runtime);
        await wait();
        console.log("Starting interaction client");
        const twitterInteractionClient = new Client.TwitterInteractionClient(
            runtime
        );
        await wait();
        console.log("Starting generation client");
        const twitterGenerationClient = new Client.TwitterGenerationClient(
            runtime
        );

        return {
            twitterInteractionClient,
            twitterSearchClient,
            twitterGenerationClient,
        };
    }

    if (!character.clients) {
        return console.error(
            "No clients found for character " + character.name
        );
    }

    const clients = [];

    if (character.clients.map((str) => str.toLowerCase()).includes("discord")) {
        const discordClient = startDiscord(runtime);
        clients.push(discordClient);
    }

    // Add Telegram client initialization
    if (
        argv.telegram ||
        character.clients.map((str) => str.toLowerCase()).includes("telegram")
    ) {
        console.log("🔄 Telegram client enabled, starting initialization...");
        const telegramClient = await startTelegram(runtime, character);
        if (telegramClient) {
            console.log(
                "✅ Successfully added Telegram client to active clients"
            );
            clients.push(telegramClient);
        } else {
            console.log("❌ Failed to initialize Telegram client");
        }
    }

    if (character.clients.map((str) => str.toLowerCase()).includes("twitter")) {
        const {
            twitterInteractionClient,
            twitterSearchClient,
            twitterGenerationClient,
        } = await startTwitter(runtime);
        clients.push(
            twitterInteractionClient,
            twitterSearchClient,
            twitterGenerationClient
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function chat() {
    rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            return;
        }

        const agentId = characters[0].name.toLowerCase(); // Assuming we're using the first character
        const response = await fetch(
            `http://localhost:3000/${agentId}/message`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: input,
                    userId: "user",
                    userName: "User",
                }),
            }
        );

        const data = await response.json();
        console.log(`${characters[0].name}: ${data.text}`);
        chat();
    });
}

console.log("Chat started. Type 'exit' to quit.");
chat();
