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
} from "@ai16z/eliza";

import { bootstrapPlugin } from "@ai16z/plugin-bootstrap"
import initSqlJs from 'sql.js';

export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
) {
    switch (provider) {
        case ModelProviderName.OPENAI:
            return getSecret(character, "OPENAI_API_KEY")
        case ModelProviderName.LLAMACLOUD:
            return findSecret(character, ["LLAMACLOUD_API_KEY", "TOGETHER_API_KEY", "XAI_API_KEY", "OPENAI_API_KEY"])
        case ModelProviderName.ANTHROPIC:
            return findSecret(character, ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"])
        case ModelProviderName.REDPILL:
            return getSecret(character, "REDPILL_API_KEY");
        case ModelProviderName.OPENROUTER:
            return getSecret(character, "OPENROUTER_API_KEY");
        case ModelProviderName.GROK:
            return getSecret(character, "GROK_API_KEY");
        case ModelProviderName.HEURIST:
            return getSecret(character, "HEURIST_API_KEY");
        case ModelProviderName.GROQ:
            return getSecret(character, "GROQ_API_KEY");
    }
}

function findSecret(character: Character, secretKeys: string[]) {
    for (const secret of secretKeys) {
        const res = getSecret(character, secret)
        if (res) return res;
    }
}

function getSecret(character: Character, secret: string) {
    return character.settings?.secrets?.[secret] || localStorage.getItem(character.id + "/secrets/" + secret);
}

class BrowserAgentRuntime extends AgentRuntime {
    getSetting(key: string) {
        return getSecret(this.character, key);
    }
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

    return new BrowserAgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [
            bootstrapPlugin,
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
        cacheManager: cache,
    });
}

async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients: Client[] = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    return clients;
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

export async function startAgent(character: Character) {
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

export async function handleRoomMessage(runtime: IAgentRuntime, roomId: UUID, user: Account, text: string) {

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

        console.log(context)

        console.log("generating message response")

        const response = await generateMessageResponse({
            runtime: runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        console.log(response)
        // save response to memory
        const responseMessage = {
            id: stringToUuid(runtime.agentId + roomId + Date.now()),
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

        return message ? [responseMessage.content, message] as const : [responseMessage.content] as const
    } catch (error) {
        console.error(error);
        throw error;
    }
}


export function createChat(runtime: IAgentRuntime, roomId: UUID, user: Account,) {
    return async function chat(input: string) {
        const res = await handleRoomMessage(runtime, roomId, user, input);
        return res;
    };
}


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