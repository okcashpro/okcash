import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres/src/index.ts";
import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite/src/index.ts";
import { DirectClientInterface } from "@ai16z/client-direct/src/index.ts";
import { DiscordClientInterface } from "@ai16z/client-discord/src/index.ts";
import { AutoClientInterface } from "@ai16z/client-auto/src/index.ts";
import { TelegramClientInterface } from "@ai16z/client-telegram/src/index.ts";
import { TwitterClientInterface } from "@ai16z/client-twitter/src/index.ts";
import { defaultCharacter } from "@ai16z/eliza/src/defaultCharacter.ts";
import { AgentRuntime } from "@ai16z/eliza/src/runtime.ts";
import settings from "@ai16z/eliza/src/settings.ts";
import {
    Character,
    IAgentRuntime,
    IDatabaseAdapter,
    ModelProviderName,
} from "@ai16z/eliza/src/types.ts";
import { bootstrapPlugin } from "@ai16z/plugin-bootstrap/src/index.ts";
import { solanaPlugin } from "@ai16z/plugin-solana/src/index.ts";
import { nodePlugin } from "@ai16z/plugin-node/src/index.ts";
import Database from "better-sqlite3";
import fs from "fs";
import readline from "readline";
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

export async function loadCharacters(
    charactersArg: string
): Promise<Character[]> {
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

                    const importedPlugins = await Promise.all(
                        character.plugins.map(async (plugin) => {
                            // if the plugin name doesnt start with @eliza,

                            const importedPlugin = await import(plugin);
                            return importedPlugin;
                        })
                    );

                    character.plugins = importedPlugins;
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
        case ModelProviderName.LLAMACLOUD:
            return (
                character.settings?.secrets?.LLAMACLOUD_API_KEY ||
                settings.LLAMACLOUD_API_KEY ||
                character.settings?.secrets?.TOGETHER_API_KEY ||
                settings.TOGETHER_API_KEY ||
                character.settings?.secrets?.XAI_API_KEY ||
                settings.XAI_API_KEY ||
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
        case ModelProviderName.OPENROUTER:
            return (
                character.settings?.secrets?.OPENROUTER ||
                settings.OPENROUTER_API_KEY
            );
    }
}

export async function createDirectRuntime(
    character: Character,
    db: IDatabaseAdapter,
    token: string
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

function initializeDatabase() {
    if (process.env.POSTGRES_URL) {
        return new PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
        });
    } else {
        return new SqliteDatabaseAdapter(new Database("./db.sqlite"));
    }
}

export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    if (clientTypes.includes("auto")) {
        const autoClient = await AutoClientInterface.start(runtime);
        if (autoClient) clients.push(autoClient);
    }

    if (clientTypes.includes("discord")) {
        clients.push(await DiscordClientInterface.start(runtime));
    }

    if (clientTypes.includes("telegram")) {
        const telegramClient = await TelegramClientInterface.start(runtime);
        if (telegramClient) clients.push(telegramClient);
    }

    if (clientTypes.includes("twitter")) {
        const twitterClients = await TwitterClientInterface.start(runtime);
        clients.push(twitterClients);
    }

    return clients;
}

export async function createAgent(
    character: Character,
    db: any,
    token: string
) {
    console.log("Creating runtime for character", character.name);
    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [
            bootstrapPlugin,
            nodePlugin,
            character.settings.secrets.WALLET_PUBLIC_KEY
                ? solanaPlugin
                : null
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
    });
}

async function startAgent(character: Character, directClient: any) {
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
        rl.question("You: ", async (input) => {
            await handleUserInput(input, agentId);
            if (input.toLowerCase() !== "exit") {
                chat(); // Loop back to ask another question
            }
        });
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
    console.log("handleUserInput", input, agentId);
    if (input.toLowerCase() === "exit") {
        rl.close();
        return;
    }

    try {
        const serverPort = parseInt(settings.SERVER_PORT || "3000");

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
        data.forEach((message) => console.log(`${"Agent"}: ${message.text}`));
    } catch (error) {
        console.error("Error fetching response:", error);
    }
}
