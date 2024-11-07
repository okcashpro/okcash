import {
    AgentRuntime,
    boredomProvider,
    Character,
    defaultActions,
    defaultCharacter,
    DirectClient,
    followRoom,
    getTokenForProvider,
    IAgentRuntime,
    initializeClients,
    initializeDatabase,
    loadActionConfigs,
    loadCustomActions,
    muteRoom,
    timeProvider,
    unfollowRoom,
    unmuteRoom,
    walletProvider,
} from "@eliza/core";
import readline from "readline";

const characters = [defaultCharacter];

const directClient = new DirectClient();

const serverPort = parseInt(process.env.SERVER_PORT || "3000");
directClient.start(serverPort);

export async function createDirectRuntime(
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

async function startAgent(character: Character) {
    try {
        const token = getTokenForProvider(character.modelProvider, character);
        const db = initializeDatabase();

        const runtime = await createDirectRuntime(character, db, token);

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
    try {
        for (const character of characters) {
            await startAgent(character);
        }
    } catch (error) {
        console.error("Error starting agents:", error);
    }
};

startAgents().catch((error) => {
    console.error("Unhandled error in startAgents:", error);
    process.exit(1); // Exit the process after logging
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function handleUserInput(input) {
    if (input.toLowerCase() === "exit") {
        rl.close();
        return;
    }

    const agentId = characters[0].name.toLowerCase();
    try {
        const response = await fetch(
            `http://localhost:3000/${agentId}/message`,
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

function chat() {
    rl.question("You: ", handleUserInput);
}

console.log("Chat started. Type 'exit' to quit.");
chat();
