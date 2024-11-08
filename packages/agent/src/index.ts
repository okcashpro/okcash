import {
    AgentRuntime,
    Character,
    defaultCharacter,
    getTokenForProvider,
    IAgentRuntime,
    initializeClients,
    loadCharacters,
    parseArguments
} from "@ai16z/eliza";
import * as Adapter from "@ai16z/eliza/adapters";
import { DirectClient, DirectClientInterface } from "@ai16z/eliza/client-direct";
import { DiscordClientInterface } from "@ai16z/eliza/client-discord";
import { TelegramClientInterface } from "@ai16z/eliza/client-telegram";
import { TwitterClientInterface } from "@ai16z/eliza/client-twitter";
import { defaultPlugin } from "@ai16z/plugin-bootstrap";
import { nodePlugin } from "@ai16z/plugin-node";
import Database from "better-sqlite3";
import readline from "readline";

import { elizaLogger } from "@ai16z/eliza/src/index.ts";
import settings from "@ai16z/eliza/src/settings.ts";
import { IDatabaseAdapter, ModelProviderName } from "@ai16z/eliza/src/types.ts";
import fs from "fs";
import yargs from "yargs";

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

export function parseArguments(): {
    character?: string;
    characters?: string;
} {
    try {
        return yargs(process.argv.slice(2))
            .option("character", {
                type: "string",
                description: "Path to the character JSON file",
            })
            .option("characters", {
                type: "string",
                description:
                    "Comma separated list of paths to character JSON files",
            })
            .parseSync();
    } catch (error) {
        console.error("Error parsing arguments:", error);
        return {};
    }
}

export async function loadCharacters(charactersArg: string): Promise<Character[]> {
    let characterPaths = charactersArg
        ?.split(",")
        .map((path) => path.trim())
        .map((path) => {
            if (path.startsWith("../characters")) {
                return `../${path}`;
            }
            if (path.startsWith("characters")) {
                return `../../${path}`;
            }
            if (path.startsWith("./characters")) {
                return `../.${path}`;
            }
            return path;
        });

    const loadedCharacters = [];

    if (characterPaths?.length > 0) {
        for (const path of characterPaths) {
            try {
                const character = JSON.parse(fs.readFileSync(path, "utf8"));

                // is there a "plugins" field?
                if (character.plugins) {
                    console.log("Plugins are: ", character.plugins);

                    const importedPlugins = await Promise.all(character.plugins.map(async (plugin) => {

                        // if the plugin name doesnt start with @eliza, 

                        const importedPlugin = await import(plugin)
                        return importedPlugin
                    }))

                    character.plugins = importedPlugins
                }

                loadedCharacters.push(character);
            } catch (e) {
                console.error(`Error loading character from ${path}: ${e}`);
            }
        }
    }

    if (loadedCharacters.length === 0) {
        console.log("No characters found, using default character");
        loadedCharacters.push(defaultCharacter);
    }

    return loadedCharacters;
}

export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
) {
    switch (provider) {
        case ModelProviderName.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ANTHROPIC:
            return (
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        case ModelProviderName.REDPILL:
            return (
                character.settings?.secrets?.REDPILL_API_KEY ||
                settings.REDPILL_API_KEY
            );
    }
}

export async function createDirectRuntime(
    character: Character,
    db: IDatabaseAdapter,
    token: string,
) {
    console.log("Creating runtime for character", character.name);
    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [],
        providers: [],
        actions: [],
        services: [],
        managers: [],
    });
}

export async function startTelegram(
    runtime: IAgentRuntime,
    character: Character
) {
    elizaLogger.log("🔍 Attempting to start Telegram bot...");
    const botToken = runtime.getSetting("TELEGRAM_BOT_TOKEN");

    if (!botToken) {
        elizaLogger.error(
            `❌ Telegram bot token is not set for character ${character.name}.`
        );
        return null;
    }

    try {
        const telegramClient = await TelegramClientInterface.start(runtime, botToken);
        return telegramClient;
    } catch (error) {
        elizaLogger.error(
            `❌ Error creating/starting Telegram client for ${character.name}:`,
            error
        );
        return null;
    }
}

export async function startTwitter(runtime: IAgentRuntime) {
    const twitterClient = await TwitterClientInterface.start(runtime);
    return twitterClient;
}

function initializeDatabase() {
    if (process.env.POSTGRES_URL) {
        return new Adapter.PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
        });
    } else {
        return new Adapter.SqliteDatabaseAdapter(new Database("./db.sqlite"));
    }
}

export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    if (clientTypes.includes("discord")) {
        clients.push(await DiscordClientInterface.start(runtime));
    }

    if (clientTypes.includes("telegram")) {
        const telegramClient = await TelegramClientInterface.start(runtime, character);
        if (telegramClient) clients.push(telegramClient);
    }

    if (clientTypes.includes("twitter")) {
        const twitterClients = await TwitterClientInterface.start(runtime);
        clients.push(...twitterClients);
    }

    return clients;
}

export async function createAgent(
    character: Character,
    db: any,
    token: string,
) {
    console.log("Creating runtime for character", character.name);
    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [defaultPlugin, nodePlugin],
        providers: [],
        actions: [],
    });
}

async function startAgent(character: Character, directClient: DirectClient) {
    try {
        const token = getTokenForProvider(character.modelProvider, character);
        const db = initializeDatabase();

        const runtime = await createAgent(character, db, token);

        const clients = await initializeClients(
            character,
            runtime as IAgentRuntime
        );

        directClient.registerAgent(await runtime);

        return clients;
    } catch (error) {
        console.error(
            `Error starting agent for character ${character.name}:`,
            error
        );
        throw error; // Re-throw after logging
    }
}

const startAgents = async () => {
    const directClient = await DirectClientInterface.start();
    const args = parseArguments();

    let charactersArg = args.characters || args.character;

    let characters = [defaultCharacter];

    if (charactersArg) {
        characters = await loadCharacters(charactersArg);
    }


    try {
        for (const character of characters) {
            await startAgent(character, directClient);
        }
    } catch (error) {
        console.error("Error starting agents:", error);
    }

    function chat() {
        const agentId = characters[0].name ?? "Agent";
        rl.question("You: ", (input) => handleUserInput(input, agentId));
    }
    
    console.log("Chat started. Type 'exit' to quit.");
    chat();
};

startAgents().catch((error) => {
    console.error("Unhandled error in startAgents:", error);
    process.exit(1); // Exit the process after logging
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function handleUserInput(input, agentId) {
    if (input.toLowerCase() === "exit") {
        rl.close();
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:${serverPort}/${agentId}/message`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: input,
                    userId: "user",
                    userName: "User",
                }),
            }
        );

        const data = await response.json();
        data.forEach((message) =>
            console.log(`${"Agent"}: ${message.text}`)
        );
    } catch (error) {
        console.error("Error fetching response:", error);
    }
}

