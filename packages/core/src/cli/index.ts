export * from "./config.ts";

import fs from "fs";
import yargs from "yargs";
import * as Action from "../actions/index.ts";
import { defaultActions } from "../core/actions.ts";
import { defaultCharacter } from "../core/defaultCharacter.ts";
import { AgentRuntime } from "../core/runtime.ts";
import settings from "../core/settings.ts";
import { Character, IAgentRuntime, ModelProvider } from "../core/types.ts";
import { elizaLogger } from "../index.ts";
import * as Provider from "../providers/index.ts";
import { Arguments } from "../types/index.ts";
import { loadActionConfigs, loadCustomActions } from "./config.ts";

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

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
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        case ModelProvider.REDPILL:
            return (
                character.settings?.secrets?.REDPILL_API_KEY ||
                settings.REDPILL_API_KEY
            );
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
        providers: [
            Provider.timeProvider,
            Provider.boredomProvider,
        ].filter(Boolean),
        actions: [
            ...defaultActions,
            // Custom actions
            Action.followRoom,
            Action.unfollowRoom,
            Action.unmuteRoom,
            Action.muteRoom,

            // imported from elizaConfig.yaml
            ...customActions,
        ],
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
        const telegramClient = new Client.TelegramClient(runtime, botToken);
        await telegramClient.start();
        elizaLogger.success(
            `✅ Telegram client successfully started for character ${character.name}`
        );
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
    elizaLogger.log("Starting Twitter clients...");
    const twitterSearchClient = new Client.TwitterSearchClient(runtime);
    await wait();
    const twitterInteractionClient = new Client.TwitterInteractionClient(
        runtime
    );
    await wait();
    const twitterGenerationClient = new Client.TwitterPostClient(runtime);

    return [
        twitterInteractionClient,
        twitterSearchClient,
        twitterGenerationClient,
    ];
}
