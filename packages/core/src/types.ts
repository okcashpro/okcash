import { Readable } from "stream";

/**
 * Represents a UUID, which is a universally unique identifier conforming to the UUID standard.
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Represents the content of a message, including its main text (`content`), any associated action (`action`), and the source of the content (`source`), if applicable.
 */
export interface Content {
    text: string; // The main text content of the message.
    action?: string; // An optional action associated with the message, indicating a specific behavior or response required.
    source?: string; // The source of the content, if applicable, such as a reference or origin.
    url?: string; // The actual URL of the message or post, i.e. tweet URL or message link in discord
    inReplyTo?: UUID; // If this is a message in a thread, or a reply, store this
    attachments?: Media[];
    [key: string]: unknown; // Allows for additional properties to be included dynamically.
}

/**
 * Represents an example of content, typically used for demonstrating or testing purposes. Includes user, content, optional action, and optional source.
 */
export interface ActionExample {
    user: string; // The user associated with the message.
    content: Content; // The content of the message.
}

/**
 * Represents an example of content, typically used for demonstrating or testing purposes. Includes user, content, optional action, and optional source.
 */
export interface ConversationExample {
    userId: UUID; // The user associated with the message.
    content: Content; // The content of the message.
}

/**
 * Represents an actor in the conversation, which could be a user or the agent itself, including their name, details (such as tagline, summary, and quote), and a unique identifier.
 */
export interface Actor {
    name: string; // The name of the actor.
    username: string; // The username of the actor.
    details: { tagline: string; summary: string; quote: string }; // Additional details about the actor, including a tagline, a summary, and a favorite quote.
    id: UUID; // A unique identifier for the actor.
}

/**
 * Represents an objective within a goal, detailing what needs to be achieved and whether it has been completed.
 */
export interface Objective {
    id?: string; // A unique identifier for the objective.
    description: string; // A description of what the objective entails.
    completed: boolean; // A boolean indicating whether the objective has been completed.
}

export enum GoalStatus {
    DONE = "DONE",
    FAILED = "FAILED",
    IN_PROGRESS = "IN_PROGRESS",
}

/**
 * Represents a goal, which is a higher-level aim composed of one or more objectives. Goals are tracked to measure progress or achievements within the conversation or system.
 */
export interface Goal {
    id?: UUID; // A unique identifier for the goal.
    roomId: UUID; // A list of user IDs associated with the goal, for goals relevant to specific users or groups.
    userId: UUID; // The user ID of the goal's owner or the user who is primarily responsible for the goal.
    name: string; // The name or title of the goal.
    status: GoalStatus; // The current status of the goal, such as "in progress" or "completed".
    objectives: Objective[]; // A list of objectives that make up the goal.
}

export enum ModelClass {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large",
    EMBEDDING = "embedding",
    IMAGE = "image",
}

export type Model = {
    endpoint?: string;
    settings: {
        maxInputTokens: number;
        maxOutputTokens: number;
        frequency_penalty?: number;
        presence_penalty?: number;
        repetition_penalty?: number;
        stop: string[];
        temperature: number;
    };
    imageSettings?: {
        steps?: number;
    };
    model: {
        [ModelClass.SMALL]: string;
        [ModelClass.MEDIUM]: string;
        [ModelClass.LARGE]: string;
        [ModelClass.EMBEDDING]?: string;
        [ModelClass.IMAGE]?: string;
    };
};

export type Models = {
    [ModelProviderName.OPENAI]: Model;
    [ModelProviderName.ANTHROPIC]: Model;
    [ModelProviderName.GROK]: Model;
    [ModelProviderName.GROQ]: Model;
    [ModelProviderName.LLAMACLOUD]: Model;
    [ModelProviderName.LLAMALOCAL]: Model;
    [ModelProviderName.GOOGLE]: Model;
    [ModelProviderName.CLAUDE_VERTEX]: Model;
    [ModelProviderName.REDPILL]: Model;
    [ModelProviderName.OPENROUTER]: Model;
    [ModelProviderName.OLLAMA]: Model;
    [ModelProviderName.HEURIST]: Model;
};

export enum ModelProviderName {
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    GROK = "grok",
    GROQ = "groq",
    LLAMACLOUD = "llama_cloud",
    LLAMALOCAL = "llama_local",
    GOOGLE = "google",
    CLAUDE_VERTEX = "claude_vertex",
    REDPILL = "redpill",
    OPENROUTER = "openrouter",
    OLLAMA = "ollama",
    HEURIST = "heurist",
}

/**
 * Represents the state of the conversation or context in which the agent is operating, including information about users, messages, goals, and other relevant data.
 */
export interface State {
    userId?: UUID; // An optional ID of the user who sent the current message.
    agentId?: UUID; // An optional ID of the agent within the current conversation or context.
    bio: string; // A string representation of the agent's bio.
    lore: string; // A list of lore bits for the agent.
    messageDirections: string; // A string representation of directions for messages in the current state.
    postDirections: string; // A string representation of directions for posting in the current state.
    roomId: UUID; // The ID of the current room or conversation context.
    agentName?: string; // An optional name of the agent, used for referencing the agent in conversations.
    senderName?: string; // An optional name of the sender of the current message.
    actors: string; // A string representation of the actors involved in the conversation, including their details.
    actorsData?: Actor[]; // An optional array of actor objects involved in the conversation.
    goals?: string; // An optional string representation of the goals relevant to the current conversation or context.
    goalsData?: Goal[]; // An optional array of goal objects relevant to the current conversation or context.
    recentMessages: string; // A string representation of recent messages in the conversation, for context.
    recentMessagesData: Memory[]; // An array of memory objects representing recent messages in the conversation.
    actionNames?: string; // An optional string listing the names of actions that are valid in the current state.
    actions?: string; // An optional string representation of actions and their descriptions, relevant to the current state.
    actionsData?: Action[]; // An optional array of action objects relevant to the current state.
    actionExamples?: string; // An optional string representation of examples of actions, for demonstration or testing.
    providers?: string; // An optional string representation of available providers and their descriptions, relevant to the current state.
    responseData?: Content; // An optional content object representing the agent's response in the current state.
    recentInteractionsData?: Memory[]; // An optional array of memory objects representing recent interactions in the conversation.
    recentInteractions?: string; // An optional string representation of recent interactions in the conversation.
    [key: string]: unknown; // Allows for additional properties to be included dynamically.
}

/**
 * Represents a memory record, which could be a message or any other piece of information remembered by the system, including its content, associated user IDs, and optionally, its embedding vector for similarity comparisons.
 */
export interface Memory {
    id?: UUID; // An optional unique identifier for the memory.
    userId: UUID; // The user ID associated with the memory.
    agentId: UUID; // The agent ID associated with the memory.
    createdAt?: number; // An optional timestamp indicating when the memory was created.
    content: Content; // The content of the memory, which can be a structured object or a plain string.
    embedding?: number[]; // An optional embedding vector representing the semantic content of the memory.
    roomId: UUID; // The room or conversation ID associated with the memory.
    unique?: boolean; // Whether the memory is unique or not
}

/**
 * Represents an example of a message, typically used for demonstrating or testing purposes, including optional content and action.
 */
export interface MessageExample {
    user: string; // The user associated with the message example.
    content: Content; // The content of the message example, which may be null for actions that don't produce visible content.
}

/**
 * Represents the type of a handler function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to any type.
 */
export type Handler = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown }, // additional options can be used for things like tests or state-passing on a chain
    callback?: HandlerCallback
) => Promise<unknown>;

//
export type HandlerCallback = (
    response: Content,
    files?: any
) => Promise<Memory[]>;

/**
 * Represents the type of a validator function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to a boolean indicating whether the validation passed.
 */
export type Validator = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
) => Promise<boolean>;

/**
 * Represents an action that the agent can perform, including conditions for its use, a description, examples, a handler function, and a validation function.
 */
export interface Action {
    similes: string[]; // An array of strings representing the similies of the action.
    description: string; // A detailed description of what the action entails.
    examples: ActionExample[][]; // An array of arrays of content examples demonstrating the action.
    handler: Handler; // The function that handles the action.
    name: string; // The name of the action.
    validate: Validator; // The function that validates whether the action is appropriate in the current context.
}

/**
 * Represents an example for evaluation, including the context, an array of message examples, and the expected outcome.
 */
export interface EvaluationExample {
    context: string; // The context in which the evaluation example is set.
    messages: Array<ActionExample>; // An array of message examples relevant to the evaluation.
    outcome: string; // The expected outcome of the evaluation, typically in a structured format such as JSON.
}

/**
 * Represents an evaluator, which is used to assess and guide the agent's responses based on the current context and state.
 */
export interface Evaluator {
    alwaysRun?: boolean;
    description: string; // A detailed description of what the evaluator assesses or guides.
    similes: string[]; // An array of strings representing the similies of the action.
    examples: EvaluationExample[]; // An array of evaluation examples demonstrating the evaluator.
    handler: Handler; // The function that handles the evaluation.
    name: string; // The name of the evaluator.
    validate: Validator; // The function that validates whether the evaluator is applicable in the current context.
}

/**
 * Represents a provider, which is used to retrieve information or perform actions on behalf of the agent, such as fetching data from an external API or service.
 */
export interface Provider {
    get: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ) => Promise<any>;
}

/**
 * Represents a relationship between two users, including their IDs, the status of the relationship, and the room ID in which the relationship is established.
 */
export interface Relationship {
    id: UUID;
    userA: UUID;
    userB: UUID;
    userId: UUID;
    roomId: UUID;
    status: string;
    createdAt?: string;
}

/**
 * Represents a user, including their name, details, and a unique identifier.
 */
export interface Account {
    id: UUID;
    name: string; // The display name in the server or their name on Twitter
    username: string; // Their actual username
    details?: { [key: string]: any };
    email?: string;
    avatarUrl?: string;
}

/**
 * Represents a participant in a room, including their ID and account details.
 */
export interface Participant {
    id: UUID;
    account: Account;
}

/**
 * Represents a room or conversation context, including its ID and a list of participants.
 */
export interface Room {
    id: UUID;
    participants: Participant[];
}

export type Media = {
    id: string;
    url: string;
    title: string;
    source: string;
    description: string;
    text: string;
};

export type Client = {
    start: (runtime?: IAgentRuntime) => Promise<unknown>;
    stop: (runtime?: IAgentRuntime) => Promise<unknown>;
};

export type Plugin = {
    name: string;
    description: string;
    actions?: Action[];
    providers?: Provider[];
    evaluators?: Evaluator[];
    services?: Service[];
};

export enum Clients {
    DISCORD = "discord",
    DIRECT = "direct",
    TWITTER = "twitter",
    TELEGRAM = "telegram",
}

export type Character = {
    id?: UUID; // optional UUID which can be passed down to identify the character
    name: string;
    system?: string;
    modelProvider: ModelProviderName;
    modelEndpointOverride?: string;
    templates?: {
        [key: string]: string;
    };
    bio: string | string[];
    lore: string[];
    messageExamples: MessageExample[][];
    postExamples: string[];
    people: string[];
    topics: string[];
    adjectives: string[];
    knowledge?: string[];
    clients: Clients[]; // list of clients the character can interact with
    plugins: Plugin[]; // list of plugins the character can use
    settings?: {
        secrets?: { [key: string]: string };
        voice?: {
            model?: string;
            url?: string;
        };
        model?: string;
        embeddingModel?: string;
    };
    clientConfig?: {
        discord?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
        };
        telegram?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
        };
    };
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };
};

export interface IDatabaseAdapter {
    db: any;
    getAccountById(userId: UUID): Promise<Account | null>;
    createAccount(account: Account): Promise<boolean>;
    getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;
    getMemoryById(id: UUID): Promise<Memory | null>;
    getMemoriesByRoomIds(params: {
        agentId?: UUID;
        roomIds: UUID[];
    }): Promise<Memory[]>;
    getCachedEmbeddings(params: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{ embedding: number[]; levenshtein_score: number }[]>;
    log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void>;
    getActorDetails(params: { roomId: UUID }): Promise<Actor[]>;
    searchMemories(params: {
        tableName: string;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]>;
    updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void>;
    searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            roomId?: UUID;
            agentId?: UUID;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]>;
    createMemory(
        memory: Memory,
        tableName: string,
        unique?: boolean
    ): Promise<void>;
    removeMemory(memoryId: UUID, tableName: string): Promise<void>;
    removeAllMemories(roomId: UUID, tableName: string): Promise<void>;
    countMemories(
        roomId: UUID,
        unique?: boolean,
        tableName?: string
    ): Promise<number>;
    getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]>;
    updateGoal(goal: Goal): Promise<void>;
    createGoal(goal: Goal): Promise<void>;
    removeGoal(goalId: UUID): Promise<void>;
    removeAllGoals(roomId: UUID): Promise<void>;
    getRoom(roomId: UUID): Promise<UUID | null>;
    createRoom(roomId?: UUID): Promise<UUID>;
    removeRoom(roomId: UUID): Promise<void>;
    getRoomsForParticipant(userId: UUID): Promise<UUID[]>;
    getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;
    addParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    removeParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
    getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;
    getParticipantUserState(
        roomId: UUID,
        userId: UUID
    ): Promise<"FOLLOWED" | "MUTED" | null>;
    setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void>;
    createRelationship(params: { userA: UUID; userB: UUID }): Promise<boolean>;
    getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null>;
    getRelationships(params: { userId: UUID }): Promise<Relationship[]>;
}

export interface IMemoryManager {
    runtime: IAgentRuntime;
    tableName: string;

    constructor: Function;

    addEmbeddingToMemory(memory: Memory): Promise<Memory>;
    getMemories(opts: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;
    getCachedEmbeddings(
        content: string
    ): Promise<{ embedding: number[]; levenshtein_score: number }[]>;
    getMemoryById(id: UUID): Promise<Memory | null>;
    getMemoriesByRoomIds(params: {
        roomIds: UUID[];
        agentId?: UUID;
    }): Promise<Memory[]>;
    searchMemoriesByEmbedding(
        embedding: number[],
        opts: {
            match_threshold?: number;
            count?: number;
            roomId: UUID;
            unique?: boolean;
            agentId?: UUID;
        }
    ): Promise<Memory[]>;
    createMemory(memory: Memory, unique?: boolean): Promise<void>;
    removeMemory(memoryId: UUID): Promise<void>;
    removeAllMemories(roomId: UUID): Promise<void>;
    countMemories(roomId: UUID, unique?: boolean): Promise<number>;
}

export abstract class Service {
    private static instance: Service | null = null;
    static serviceType: ServiceType;

    public static getInstance<T extends Service>(): T {
        if (!Service.instance) {
            // Use this.prototype.constructor to instantiate the concrete class
            Service.instance = new (this as any)();
        }
        return Service.instance as T;
    }
}

export interface IAgentRuntime {
    // Properties
    agentId: UUID;
    serverUrl: string;
    databaseAdapter: IDatabaseAdapter;
    token: string | null;
    modelProvider: ModelProviderName;
    character: Character;
    providers: Provider[];
    actions: Action[];
    evaluators: Evaluator[];

    messageManager: IMemoryManager;
    descriptionManager: IMemoryManager;
    loreManager: IMemoryManager;

    services: Map<ServiceType, Service>;
    registerMemoryManager(manager: IMemoryManager): void;

    getMemoryManager(name: string): IMemoryManager | null;

    getService(service: string): typeof Service | null;

    registerService(service: Service): void;

    getSetting(key: string): string | null;

    // Methods
    getConversationLength(): number;
    processActions(
        message: Memory,
        responses: Memory[],
        state?: State,
        callback?: HandlerCallback
    ): Promise<void>;
    evaluate(
        message: Memory,
        state?: State,
        didRespond?: boolean
    ): Promise<string[]>;
    ensureParticipantExists(userId: UUID, roomId: UUID): Promise<void>;
    ensureUserExists(
        userId: UUID,
        userName: string | null,
        name: string | null,
        source: string | null
    ): Promise<void>;
    registerAction(action: Action): void;
    ensureConnection(
        userId: UUID,
        roomId: UUID,
        userName?: string,
        userScreenName?: string,
        source?: string
    ): Promise<void>;
    ensureParticipantInRoom(userId: UUID, roomId: UUID): Promise<void>;
    ensureRoomExists(roomId: UUID): Promise<void>;
    composeState(
        message: Memory,
        additionalKeys?: { [key: string]: unknown }
    ): Promise<State>;
    updateRecentMessageState(state: State): Promise<State>;
}

export interface IImageDescriptionService extends Service {
    getInstance(): IImageDescriptionService;
    initialize(modelId?: string | null, device?: string | null): Promise<void>;
    describeImage(
        imageUrl: string
    ): Promise<{ title: string; description: string }>;
}

export interface ITranscriptionService extends Service {
    transcribeAttachment(audioBuffer: ArrayBuffer): Promise<string | null>;
    transcribeAttachmentLocally(
        audioBuffer: ArrayBuffer
    ): Promise<string | null>;
    transcribe(audioBuffer: ArrayBuffer): Promise<string | null>;
    transcribeLocally(audioBuffer: ArrayBuffer): Promise<string | null>;
}

export interface IVideoService extends Service {
    isVideoUrl(url: string): boolean;
    processVideo(url: string): Promise<Media>;
    fetchVideoInfo(url: string): Promise<Media>;
    downloadVideo(videoInfo: Media): Promise<string>;
}

export interface ITextGenerationService extends Service {
    getInstance(): ITextGenerationService;
    initializeModel(): Promise<void>;
    queueMessageCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<any>;
    queueTextCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number
    ): Promise<string>;
    getEmbeddingResponse(input: string): Promise<number[] | undefined>;
}

export interface IBrowserService extends Service {
    initialize(): Promise<void>;
    closeBrowser(): Promise<void>;
    getPageContent(
        url: string,
        runtime: IAgentRuntime
    ): Promise<{ title: string; description: string; bodyContent: string }>;
}

export interface ISpeechService extends Service {
    generate(runtime: IAgentRuntime, text: string): Promise<Readable>;
}

export interface IPdfService extends Service {
    convertPdfToText(pdfBuffer: Buffer): Promise<string>;
}

export enum ServiceType {
    IMAGE_DESCRIPTION = "image_description",
    TRANSCRIPTION = "transcription",
    VIDEO = "video",
    TEXT_GENERATION = "text_generation",
    BROWSER = "browser",
    SPEECH_GENERATION = "speech_generation",
    PDF = "pdf",
}
