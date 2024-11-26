import { SqlJsDatabaseAdapter } from "@ai16z/adapter-sqljs";
import {
    DbCacheAdapter,
    ICacheManager,
    IDatabaseCacheAdapter,
    stringToUuid,
    AgentRuntime,
    CacheManager,
    Character,
    IAgentRuntime,
    ModelProviderName,
    elizaLogger,
    settings,
    IDatabaseAdapter,
    Client,
    UUID,
    Account,
    Content,
    Memory,
    composeContext,
    messageCompletionFooter,
    ModelClass,
    generateMessageResponse,
} from "@ai16z/eliza"
import { character } from "./character.ts";
import initSqlJs from 'sql.js';

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};


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
    }
}


export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients: Client[] = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    return clients;
}

function getSecret(character: Character, secret: string) {
    return character.settings?.secrets?.[secret] || process.env[secret];
}

export function createAgent(
    character: Character,
    db: IDatabaseAdapter,
    cache: ICacheManager,
    token: string
) {
    elizaLogger.success(
        elizaLogger.successesTitle,
        "Creating runtime for character",
        character.name
    );

    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
        cacheManager: cache,
    });
}

async function initializeDatabase() {
    const SQL = await initSqlJs({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: file => `https://sql.js.org/dist/${file}`
    });

    return new SqlJsDatabaseAdapter(new SQL.Database());
}

function intializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    const cache = new CacheManager(new DbCacheAdapter(db, character.id!));
    return cache;
}

async function startAgent(character: Character) {
    try {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);

        const db = await initializeDatabase();

        await db.init();

        const cache = intializeDbCache(character, db);
        const runtime = createAgent(character, db, cache, token!);

        await runtime.initialize();

        await initializeClients(character, runtime);

        return runtime;
    } catch (error) {
        elizaLogger.error(
            `Error starting agent for character ${character.name}:`,
            error
        );
        console.error(error);
        throw error;
    }
}

async function handleRoomMessage(runtime: IAgentRuntime, roomId: UUID, user: Account, text: string) {

    await runtime.ensureConnection(
        user.id,
        roomId,
        user.username,
        user.name,
        "direct"
    );

    const messageId = stringToUuid(Date.now().toString());

    const content: Content = {
        text,
        attachments: [],
        source: "direct",
        inReplyTo: undefined,
    };

    const userMessage = {
        content,
        userId: user.id,
        roomId,
        agentId: runtime.agentId,
    };

    const memory: Memory = {
        id: messageId,
        agentId: runtime.agentId,
        userId: user.id,
        roomId,
        content,
        createdAt: Date.now(),
    };

    console.log("creating memory")

    await runtime.messageManager.createMemory(memory);
    console.log("composeState")

    try {


        const state = await runtime.composeState(userMessage, {
            agentName: runtime.character.name,
        });
        console.log("composeContext")

        const context = composeContext({
            state,
            template: messageHandlerTemplate,
        });

        console.log("generating message response")

        const response = await generateMessageResponse({
            runtime: runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        console.log(response)
        // save response to memory
        const responseMessage = {
            // id: stringToUuid(runtime.agentId + roomId + Date.now()),
            ...userMessage,
            userId: runtime.agentId,
            content: response,
        };

        console.log("creating response memory")

        await runtime.messageManager.createMemory(responseMessage);

        console.log("creating response memory done")
        let message = null as Content | null;

        console.log("evaluating...")

        await runtime.evaluate(memory, state);

        console.log("evaluating done")

        console.log("processing actions...")
        await runtime.processActions(
            memory,
            [responseMessage],
            state,
            async (newMessages) => {
                message = newMessages;
                return [memory];
            }
        );

        console.log("processing actions done")

        console.log(responseMessage)
        if (message)
            console.log(message)

        return [responseMessage, message]
    } catch (error) {
        console.error(error);
        throw error;
    }
}


function createChat(runtime: IAgentRuntime, roomId: UUID, user: Account,) {
    return async function chat(input: string) {
        const res = await handleRoomMessage(runtime, roomId, user, input);
        return res;
    };
}



async function main() {


    const agent = await startAgent(character);
    console.log({ agent });

    const chat = createChat(agent, stringToUuid("test"), {
        id: stringToUuid("fooo"),
        name: "foo",
        username: "foo"

    })

    window.chat = chat;
    console.log(chat);
}

main().catch(err => {
    console.error(err);
})


export const messageHandlerTemplate =
    // {{goals}}
    `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;