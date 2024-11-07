import {
    AgentRuntime,
    boredomProvider,
    Character,
    defaultActions,
    defaultCharacter,
    followRoom,
    getTokenForProvider,
    IAgentRuntime,
    initializeClients,
    loadActionConfigs,
    loadCharacters,
    loadCustomActions,
    muteRoom,
    parseArguments,
    timeProvider,
    unfollowRoom,
    unmuteRoom,
    walletProvider,
} from "@ai16z/eliza";
import * as Adapter from "@ai16z/eliza/adapters";
import Database from "better-sqlite3";
import readline from "readline";
import { DirectClient, DirectClientInterface } from "@ai16z/eliza/client-direct";
import { DiscordClientInterface } from "@ai16z/eliza/client-discord";
import { TelegramClientInterface } from "@ai16z/eliza/client-telegram";
import { TwitterClientInterface } from "@ai16z/eliza/client-twitter";

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
    configPath: string = "./elizaConfig.yaml"
) {
    console.log("Creating runtime for character", character.name);
    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        providers: [
            timeProvider,
            boredomProvider,
            character.settings?.secrets?.WALLET_PUBLIC_KEY && walletProvider,
        ].filter(Boolean),
        actions: [
            ...defaultActions,

            // Custom actions
            followRoom,
            unfollowRoom,
            unmuteRoom,
            muteRoom,

            // imported from elizaConfig.yaml
            ...(await loadCustomActions(loadActionConfigs(configPath))),
        ],
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
            console.log(`${characters[0].name}: ${message.text}`)
        );
    } catch (error) {
        console.error("Error fetching response:", error);
    }

    chat();
}

