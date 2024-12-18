import { PostgresDatabaseAdapter } from "@okcashpro/adapter-postgres";
import { SqliteDatabaseAdapter } from "@okcashpro/adapter-sqlite";
import { AutoClientInterface } from "@okcashpro/client-auto";
import { DiscordClientInterface } from "@okcashpro/client-discord";
import { FarcasterAgentClient } from "@okcashpro/client-farcaster";
import { LensAgentClient } from "@okcashpro/client-lens";
import { SlackClientInterface } from "@okcashpro/client-slack";
import { TelegramClientInterface } from "@okcashpro/client-telegram";
import { TwitterClientInterface } from "@okcashpro/client-twitter";
import {
    AgentRuntime,
    CacheManager,
    Character,
    Clients,
    DbCacheAdapter,
    defaultCharacter,
    okaiLogger,
    FsCacheAdapter,
    IAgentRuntime,
    ICacheManager,
    IDatabaseAdapter,
    IDatabaseCacheAdapter,
    ModelProviderName,
    settings,
    stringToUuid,
    validateCharacterConfig,
} from "@okcashpro/okai";
import { zgPlugin } from "@okcashpro/plugin-0g";
import { bootstrapPlugin } from "@okcashpro/plugin-bootstrap";
import createGoatPlugin from "@okcashpro/plugin-goat";
// import { intifacePlugin } from "@okcashpro/plugin-intiface";
import { DirectClient } from "@okcashpro/client-direct";
import { aptosPlugin } from "@okcashpro/plugin-aptos";
import {
    advancedTradePlugin,
    coinbaseCommercePlugin,
    coinbaseMassPaymentsPlugin,
    tokenContractPlugin,
    tradePlugin,
    webhookPlugin,
} from "@okcashpro/plugin-coinbase";
import { confluxPlugin } from "@okcashpro/plugin-conflux";
import { evmPlugin } from "@okcashpro/plugin-evm";
import { storyPlugin } from "@okcashpro/plugin-story";
import { flowPlugin } from "@okcashpro/plugin-flow";
import { imageGenerationPlugin } from "@okcashpro/plugin-image-generation";
import { multiversxPlugin } from "@okcashpro/plugin-multiversx";
import { nearPlugin } from "@okcashpro/plugin-near";
import { nftGenerationPlugin } from "@okcashpro/plugin-nft-generation";
import { createNodePlugin } from "@okcashpro/plugin-node";
import { solanaPlugin } from "@okcashpro/plugin-solana";
import { suiPlugin } from "@okcashpro/plugin-sui";
import { TEEMode, teePlugin } from "@okcashpro/plugin-tee";
import { tonPlugin } from "@okcashpro/plugin-ton";
import { zksyncEraPlugin } from "@okcashpro/plugin-zksync-era";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yargs from "yargs";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

const logFetch = async (url: string, options: any) => {
    okaiLogger.debug(`Fetching ${url}`);
    okaiLogger.debug(JSON.stringify(options, null, 2));
    return fetch(url, options);
};

export function parseArguments(): {
    character?: string;
    characters?: string;
} {
    try {
        return yargs(process.argv.slice(3))
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
        okaiLogger.error("Error parsing arguments:", error);
        return {};
    }
}

function tryLoadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
}

function isAllStrings(arr: unknown[]): boolean {
    return Array.isArray(arr) && arr.every((item) => typeof item === "string");
}

export async function loadCharacters(
    charactersArg: string
): Promise<Character[]> {
    let characterPaths = charactersArg
        ?.split(",")
        .map((filePath) => filePath.trim());
    const loadedCharacters = [];

    if (characterPaths?.length > 0) {
        for (const characterPath of characterPaths) {
            let content = null;
            let resolvedPath = "";

            // Try different path resolutions in order
            const pathsToTry = [
                characterPath, // exact path as specified
                path.resolve(process.cwd(), characterPath), // relative to cwd
                path.resolve(process.cwd(), "agent", characterPath), // Add this
                path.resolve(__dirname, characterPath), // relative to current script
                path.resolve(
                    __dirname,
                    "characters",
                    path.basename(characterPath)
                ), // relative to agent/characters
                path.resolve(
                    __dirname,
                    "../characters",
                    path.basename(characterPath)
                ), // relative to characters dir from agent
                path.resolve(
                    __dirname,
                    "../../characters",
                    path.basename(characterPath)
                ), // relative to project root characters dir
            ];

            okaiLogger.info(
                "Trying paths:",
                pathsToTry.map((p) => ({
                    path: p,
                    exists: fs.existsSync(p),
                }))
            );

            for (const tryPath of pathsToTry) {
                content = tryLoadFile(tryPath);
                if (content !== null) {
                    resolvedPath = tryPath;
                    break;
                }
            }

            if (content === null) {
                okaiLogger.error(
                    `Error loading character from ${characterPath}: File not found in any of the expected locations`
                );
                okaiLogger.error("Tried the following paths:");
                pathsToTry.forEach((p) => okaiLogger.error(` - ${p}`));
                process.exit(1);
            }

            try {
                const character = JSON.parse(content);
                validateCharacterConfig(character);

                // Handle plugins
                if (isAllStrings(character.plugins)) {
                    okaiLogger.info("Plugins are: ", character.plugins);
                    const importedPlugins = await Promise.all(
                        character.plugins.map(async (plugin) => {
                            const importedPlugin = await import(plugin);
                            return importedPlugin.default;
                        })
                    );
                    character.plugins = importedPlugins;
                }

                loadedCharacters.push(character);
                okaiLogger.info(
                    `Successfully loaded character from: ${resolvedPath}`
                );
            } catch (e) {
                okaiLogger.error(
                    `Error parsing character from ${resolvedPath}: ${e}`
                );
                process.exit(1);
            }
        }
    }

    if (loadedCharacters.length === 0) {
        okaiLogger.info("No characters found, using default character");
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
        case ModelProviderName.ETERNALAI:
            return (
                character.settings?.secrets?.ETERNALAI_API_KEY ||
                settings.ETERNALAI_API_KEY
            );
        case ModelProviderName.LLAMACLOUD:
        case ModelProviderName.TOGETHER:
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
        case ModelProviderName.GROK:
            return (
                character.settings?.secrets?.GROK_API_KEY ||
                settings.GROK_API_KEY
            );
        case ModelProviderName.HEURIST:
            return (
                character.settings?.secrets?.HEURIST_API_KEY ||
                settings.HEURIST_API_KEY
            );
        case ModelProviderName.GROQ:
            return (
                character.settings?.secrets?.GROQ_API_KEY ||
                settings.GROQ_API_KEY
            );
        case ModelProviderName.GALADRIEL:
            return (
                character.settings?.secrets?.GALADRIEL_API_KEY ||
                settings.GALADRIEL_API_KEY
            );
        case ModelProviderName.FAL:
            return (
                character.settings?.secrets?.FAL_API_KEY || settings.FAL_API_KEY
            );
        case ModelProviderName.ALI_BAILIAN:
            return (
                character.settings?.secrets?.ALI_BAILIAN_API_KEY ||
                settings.ALI_BAILIAN_API_KEY
            );
        case ModelProviderName.VOLENGINE:
            return (
                character.settings?.secrets?.VOLENGINE_API_KEY ||
                settings.VOLENGINE_API_KEY
            );
        case ModelProviderName.NANOGPT:
            return (
                character.settings?.secrets?.NANOGPT_API_KEY ||
                settings.NANOGPT_API_KEY
            );
        case ModelProviderName.HYPERBOLIC:
            return (
                character.settings?.secrets?.HYPERBOLIC_API_KEY ||
                settings.HYPERBOLIC_API_KEY
            );
        case ModelProviderName.VENICE:
            return (
                character.settings?.secrets?.VENICE_API_KEY ||
                settings.VENICE_API_KEY
            );
        case ModelProviderName.AKASH_CHAT_API:
            return (
                character.settings?.secrets?.AKASH_CHAT_API_KEY ||
                settings.AKASH_CHAT_API_KEY
            );
    }
}

function initializeDatabase(dataDir: string) {
    if (process.env.POSTGRES_URL) {
        okaiLogger.info("Initializing PostgreSQL connection...");
        const db = new PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
            parseInputs: true,
        });

        // Test the connection
        db.init()
            .then(() => {
                okaiLogger.success(
                    "Successfully connected to PostgreSQL database"
                );
            })
            .catch((error) => {
                okaiLogger.error("Failed to connect to PostgreSQL:", error);
            });

        return db;
    } else {
        const filePath =
            process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite");
        // ":memory:";
        const db = new SqliteDatabaseAdapter(new Database(filePath));
        return db;
    }
}

// also adds plugins from character file into the runtime
export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    // each client can only register once
    // and if we want two we can explicitly support it
    const clients: Record<string, any> = {};
    const clientTypes: string[] =
        character.clients?.map((str) => str.toLowerCase()) || [];
    okaiLogger.log("initializeClients", clientTypes, "for", character.name);

    if (clientTypes.includes(Clients.DIRECT)) {
        const autoClient = await AutoClientInterface.start(runtime);
        if (autoClient) clients.auto = autoClient;
    }

    if (clientTypes.includes(Clients.DISCORD)) {
        const discordClient = await DiscordClientInterface.start(runtime);
        if (discordClient) clients.discord = discordClient;
    }

    if (clientTypes.includes(Clients.TELEGRAM)) {
        const telegramClient = await TelegramClientInterface.start(runtime);
        if (telegramClient) clients.telegram = telegramClient;
    }

    if (clientTypes.includes(Clients.TWITTER)) {
        const twitterClient = await TwitterClientInterface.start(runtime);

        if (twitterClient) {
            clients.twitter = twitterClient;
            (twitterClient as any).enableSearch = !isFalsish(
                getSecret(character, "TWITTER_SEARCH_ENABLE")
            );
        }
    }

    if (clientTypes.includes(Clients.FARCASTER)) {
        // why is this one different :(
        const farcasterClient = new FarcasterAgentClient(runtime);
        if (farcasterClient) {
            farcasterClient.start();
            clients.farcaster = farcasterClient;
        }
    }
    if (clientTypes.includes("lens")) {
        const lensClient = new LensAgentClient(runtime);
        lensClient.start();
        clients.lens = lensClient;
    }

    okaiLogger.log("client keys", Object.keys(clients));

    // TODO: Add Slack client to the list
    if (clientTypes.includes("slack")) {
        const slackClient = await SlackClientInterface.start(runtime);
        if (slackClient) clients.push(slackClient);
    }

    if (character.plugins?.length > 0) {
        for (const plugin of character.plugins) {
            // if plugin has clients, add those..
            if (plugin.clients) {
                for (const client of plugin.clients) {
                    clients.push(await client.start(runtime));
                }
            }
        }
    }

    return clients;
}

function isFalsish(input: any): boolean {
    // If the input is exactly NaN, return true
    if (Number.isNaN(input)) {
        return true;
    }

    // Convert input to a string if it's not null or undefined
    const value = input == null ? "" : String(input);

    // List of common falsish string representations
    const falsishValues = [
        "false",
        "0",
        "no",
        "n",
        "off",
        "null",
        "undefined",
        "",
    ];

    // Check if the value (trimmed and lowercased) is in the falsish list
    return falsishValues.includes(value.trim().toLowerCase());
}

function getSecret(character: Character, secret: string) {
    return character.settings?.secrets?.[secret] || process.env[secret];
}

let nodePlugin: any | undefined;

export async function createAgent(
    character: Character,
    db: IDatabaseAdapter,
    cache: ICacheManager,
    token: string
): Promise<AgentRuntime> {
    okaiLogger.success(
        okaiLogger.successesTitle,
        "Creating runtime for character",
        character.name
    );

    nodePlugin ??= createNodePlugin();

    const teeMode = getSecret(character, "TEE_MODE") || "OFF";
    const walletSecretSalt = getSecret(character, "WALLET_SECRET_SALT");

    // Validate TEE configuration
    if (teeMode !== TEEMode.OFF && !walletSecretSalt) {
        okaiLogger.error(
            "WALLET_SECRET_SALT required when TEE_MODE is enabled"
        );
        throw new Error("Invalid TEE configuration");
    }

    let goatPlugin: any | undefined;
    if (getSecret(character, "ALCHEMY_API_KEY")) {
        goatPlugin = await createGoatPlugin((secret) =>
            getSecret(character, secret)
        );
    }

    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        // character.plugins are handled when clients are added
        plugins: [
            bootstrapPlugin,
            getSecret(character, "CONFLUX_CORE_PRIVATE_KEY")
                ? confluxPlugin
                : null,
            nodePlugin,
            getSecret(character, "SOLANA_PUBLIC_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
                ? solanaPlugin
                : null,
            (getSecret(character, "NEAR_ADDRESS") ||
                getSecret(character, "NEAR_WALLET_PUBLIC_KEY")) &&
            getSecret(character, "NEAR_WALLET_SECRET_KEY")
                ? nearPlugin
                : null,
            getSecret(character, "EVM_PUBLIC_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
                ? evmPlugin
                : null,
            (getSecret(character, "SOLANA_PUBLIC_KEY") ||
                (getSecret(character, "WALLET_PUBLIC_KEY") &&
                    !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith(
                        "0x"
                    ))) &&
            getSecret(character, "SOLANA_ADMIN_PUBLIC_KEY") &&
            getSecret(character, "SOLANA_PRIVATE_KEY") &&
            getSecret(character, "SOLANA_ADMIN_PRIVATE_KEY")
                ? nftGenerationPlugin
                : null,
            getSecret(character, "ZEROG_PRIVATE_KEY") ? zgPlugin : null,
            getSecret(character, "COINBASE_COMMERCE_KEY")
                ? coinbaseCommercePlugin
                : null,
            getSecret(character, "FAL_API_KEY") ||
            getSecret(character, "OPENAI_API_KEY") ||
            getSecret(character, "VENICE_API_KEY") ||
            getSecret(character, "HEURIST_API_KEY")
                ? imageGenerationPlugin
                : null,
            ...(getSecret(character, "COINBASE_API_KEY") &&
            getSecret(character, "COINBASE_PRIVATE_KEY")
                ? [
                      coinbaseMassPaymentsPlugin,
                      tradePlugin,
                      tokenContractPlugin,
                      advancedTradePlugin,
                  ]
                : []),
            ...(teeMode !== TEEMode.OFF && walletSecretSalt
                ? [teePlugin, solanaPlugin]
                : []),
            getSecret(character, "COINBASE_API_KEY") &&
            getSecret(character, "COINBASE_PRIVATE_KEY") &&
            getSecret(character, "COINBASE_NOTIFICATION_URI")
                ? webhookPlugin
                : null,
            getSecret(character, "ALCHEMY_API_KEY") ? goatPlugin : null,
            getSecret(character, "FLOW_ADDRESS") &&
            getSecret(character, "FLOW_PRIVATE_KEY")
                ? flowPlugin
                : null,
            getSecret(character, "APTOS_PRIVATE_KEY") ? aptosPlugin : null,
            getSecret(character, "MVX_PRIVATE_KEY") ? multiversxPlugin : null,
            getSecret(character, "ZKSYNC_PRIVATE_KEY") ? zksyncEraPlugin : null,
            getSecret(character, "TON_PRIVATE_KEY") ? tonPlugin : null,
            getSecret(character, "SUI_PRIVATE_KEY") ? suiPlugin : null,
            getSecret(character, "STORY_PRIVATE_KEY") ? storyPlugin : null,
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
        cacheManager: cache,
        fetch: logFetch,
    });
}

function initializeFsCache(baseDir: string, character: Character) {
    const cacheDir = path.resolve(baseDir, character.id, "cache");

    const cache = new CacheManager(new FsCacheAdapter(cacheDir));
    return cache;
}

function initializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    const cache = new CacheManager(new DbCacheAdapter(db, character.id));
    return cache;
}

async function startAgent(
    character: Character,
    directClient
): Promise<AgentRuntime> {
    let db: IDatabaseAdapter & IDatabaseCacheAdapter;
    try {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);
        const dataDir = path.join(__dirname, "../data");

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = initializeDatabase(dataDir) as IDatabaseAdapter &
            IDatabaseCacheAdapter;

        await db.init();

        const cache = initializeDbCache(character, db);
        const runtime: AgentRuntime = await createAgent(
            character,
            db,
            cache,
            token
        );

        // start services/plugins/process knowledge
        await runtime.initialize();

        // start assigned clients
        runtime.clients = await initializeClients(character, runtime);

        // add to container
        directClient.registerAgent(runtime);

        // report to console
        okaiLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

        return runtime;
    } catch (error) {
        okaiLogger.error(
            `Error starting agent for character ${character.name}:`,
            error
        );
        okaiLogger.error(error);
        if (db) {
            await db.close();
        }
        throw error;
    }
}

const startAgents = async () => {
    const directClient = new DirectClient();
    const serverPort = parseInt(settings.SERVER_PORT || "3000");
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
        okaiLogger.error("Error starting agents:", error);
    }

    // upload some agent functionality into directClient
    directClient.startAgent = async (character) => {
        // wrap it so we don't have to inject directClient later
        return startAgent(character, directClient);
    };
    directClient.start(serverPort);

    okaiLogger.log(
        "Run `pnpm start:client` to start the client and visit the outputted URL (http://localhost:5173) to chat with your agents"
    );
};

startAgents().catch((error) => {
    okaiLogger.error("Unhandled error in startAgents:", error);
    process.exit(1); // Exit the process after logging
});
