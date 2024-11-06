import {
    Character,
    createAgentRuntime,
    createDirectRuntime,
    DirectClient,
    getTokenForProvider,
    IAgentRuntime,
    initializeClients,
    initializeDatabase,
    loadCharacters,
    parseArguments,
} from "@eliza/core";
import { Arguments } from "@eliza/core/src/types";
import readline from "readline";

let argv: Arguments = parseArguments();
let basePath = "./";
// if argv.isroot is true, then set the base path to "../"
if (argv.isRoot) {
    basePath = "../";
}

// if the path doesnt start with a /, add the base path to the beginning of the path
if (!argv.characters?.startsWith("/")) {
    argv.characters = `${basePath}${argv.characters}`;
}

let characters = loadCharacters(argv.characters);
if (!characters || characters.length === 0) {
    console.error("No characters loaded. Please check the characters file.");
    process.exit(1);
}

characters.forEach((char, index) => {
    if (!char.name || !char.modelProvider) {
        console.error(
            `Character at index ${index} is missing required fields.`
        );
        process.exit(1);
    }
});

const directClient = new DirectClient();

const serverPort = parseInt(process.env.SERVER_PORT || "3000");
directClient.start(serverPort);

async function startAgent(character: Character) {
    try {
        const token = getTokenForProvider(character.modelProvider, character);
        const db = initializeDatabase();

        const runtime = await createAgentRuntime(character, db, token);
        const directRuntime = createDirectRuntime(character, db, token);

        const clients = await initializeClients(
            character,
            runtime as IAgentRuntime
        );
        directClient.registerAgent(await directRuntime);

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

function chat() {
    rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            return;
        }

        const agentId = characters[0].name.toLowerCase();
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
        for (const message of data) {
            console.log(`${characters[0].name}: ${message.text}`);
        }
        chat();
    });
}

console.log("Chat started. Type 'exit' to quit.");
chat();
