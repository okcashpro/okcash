import defaultCharacter from "../core/defaultCharacter.ts";
import settings from "../core/settings.ts";
import { Character, IAgentRuntime, ModelProvider } from "../core/types.ts";
import * as Action from "../actions/index.ts";
import * as Client from "../clients/index.ts";
import * as Adapter from "../adapters/index.ts";
import * as Provider from "../providers/index.ts";
import yargs from "yargs";
import { wait } from "../clients/twitter/utils.ts";

import fs from "fs";
import Database from "better-sqlite3";
import { AgentRuntime } from "../core/runtime.ts";
import { defaultActions } from "../core/actions.ts";
import { Arguments } from "../types/index.ts";
import { loadActionConfigs, loadCustomActions } from "./config.ts";
import { prettyConsole } from "../index.ts";

export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    if (clientTypes.includes("discord")) {
        clients.push(startDiscord(runtime));
    }

    if (clientTypes.includes("telegram")) {
        const telegramClient = await startTelegram(runtime, character);
        if (telegramClient) clients.push(telegramClient);
    }

    if (clientTypes.includes("twitter")) {
        const twitterClients = await startTwitter(runtime);
        clients.push(...twitterClients);
    }

    return clients;
}

export function parseArguments(): Arguments {
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
            .option("telegram", {
                type: "boolean",
                description: "Enable Telegram client",
                default: false,
            })
            .parseSync() as Arguments;
    } catch (error) {
        console.error("Error parsing arguments:", error);
        return {};
    }
}

export function loadCharacters(charactersArg: string): Character[] {
    const characterPaths = charactersArg?.split(",").map((path) => path.trim());
    const loadedCharacters = [];

    if (characterPaths?.length > 0) {
        for (const path of characterPaths) {
            try {
                const character = JSON.parse(fs.readFileSync(path, "utf8"));
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
    provider: ModelProvider,
    character: Character
) {
    switch (provider) {
        case ModelProvider.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProvider.ANTHROPIC:
            return (
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.CLAUDE_API_KEY
            );
    }
}
export function initializeDatabase() {
    if (process.env.POSTGRES_URL) {
        return new Adapter.PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
        });
    } else {
        return new Adapter.SqliteDatabaseAdapter(new Database("./db.sqlite"));
    }
}

export async function createAgentRuntime(
    character: Character,
    db: any,
    token: string,
    configPath: string = "./elizaConfig.yaml"
) {
    const actionConfigs = loadActionConfigs(configPath);
    const customActions = await loadCustomActions(actionConfigs);

    console.log("Creating runtime for character", character.name);

    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        providers: [Provider.timeProvider, Provider.boredomProvider],
        actions: [
            // Default actions
            ...defaultActions,

            // Custom actions
            Action.followRoom,
            Action.unfollowRoom,
            Action.unmuteRoom,
            Action.muteRoom,
            Action.imageGeneration,

            // imported from elizaConfig.yaml
            ...customActions,
        ],
    });
}

export async function createDirectRuntime(
    character: Character,
    db: any,
    token: string,
    configPath: string = "./elizaConfig.yaml"
) {
    const actionConfigs = loadActionConfigs(configPath);
    const customActions = await loadCustomActions(actionConfigs);

    console.log("Creating runtime for character", character.name);
    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        providers: [Provider.timeProvider, Provider.boredomProvider],
        actions: [
            ...defaultActions,
            // Custom actions
            Action.followRoom,
            Action.unfollowRoom,
            Action.unmuteRoom,
            Action.muteRoom,
            Action.imageGeneration,

            // imported from elizaConfig.yaml
            ...customActions,
        ],
    });
}

export function startDiscord(runtime: IAgentRuntime) {
    return new Client.DiscordClient(runtime);
}

export async function startTelegram(
    runtime: IAgentRuntime,
    character: Character
) {
    prettyConsole.log("🔍 Attempting to start Telegram bot...");
    const botToken = runtime.getSetting("TELEGRAM_BOT_TOKEN");

    if (!botToken) {
        prettyConsole.error(
            `❌ Telegram bot token is not set for character ${character.name}.`
        );
        return null;
    }

    try {
        const telegramClient = new Client.TelegramClient(runtime, botToken);
        await telegramClient.start();
        prettyConsole.success(
            `✅ Telegram client successfully started for character ${character.name}`
        );
        return telegramClient;
    } catch (error) {
        prettyConsole.error(
            `❌ Error creating/starting Telegram client for ${character.name}:`,
            error
        );
        return null;
    }
}

export async function startTwitter(runtime: IAgentRuntime) {
    prettyConsole.log("Starting Twitter clients...");
    const twitterSearchClient = new Client.TwitterSearchClient(runtime);
    await wait();
    const twitterInteractionClient = new Client.TwitterInteractionClient(
        runtime
    );
    await wait();
    const twitterGenerationClient = new Client.TwitterGenerationClient(runtime);

    return [
        twitterInteractionClient,
        twitterSearchClient,
        twitterGenerationClient,
    ];
}
