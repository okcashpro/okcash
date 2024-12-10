import { names, uniqueNamesGenerator } from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";
import {
    composeActionExamples,
    formatActionNames,
    formatActions,
} from "./actions.ts";
import { addHeader, composeContext } from "./context.ts";
import { defaultCharacter } from "./defaultCharacter.ts";
import {
    evaluationTemplate,
    formatEvaluatorExamples,
    formatEvaluatorNames,
    formatEvaluators,
} from "./evaluators.ts";
import { generateText } from "./generation.ts";
import { formatGoalsAsString, getGoals } from "./goals.ts";
import { okaiLogger } from "./index.ts";
import knowledge from "./knowledge.ts";
import { MemoryManager } from "./memory.ts";
import { formatActors, formatMessages, getActorDetails } from "./messages.ts";
import { parseJsonArrayFromText } from "./parsing.ts";
import { formatPosts } from "./posts.ts";
import { getProviders } from "./providers.ts";
import settings from "./settings.ts";
import {
    Character,
    Goal,
    HandlerCallback,
    IAgentRuntime,
    ICacheManager,
    IDatabaseAdapter,
    IMemoryManager,
    KnowledgeItem,
    ModelClass,
    ModelProviderName,
    Plugin,
    Provider,
    Service,
    ServiceType,
    State,
    UUID,
    type Action,
    type Actor,
    type Evaluator,
    type Memory,
} from "./types.ts";
import { stringToUuid } from "./uuid.ts";

/**
 * Represents the runtime environment for an agent, handling message processing,
 * action registration, and interaction with external services like OpenAI and Supabase.
 */
export class AgentRuntime implements IAgentRuntime {
    /**
     * Default count for recent messages to be kept in memory.
     * @private
     */
    readonly #conversationLength = 32 as number;
    /**
     * The ID of the agent
     */
    agentId: UUID;
    /**
     * The base URL of the server where the agent's requests are processed.
     */
    serverUrl = "http://localhost:7998";

    /**
     * The database adapter used for interacting with the database.
     */
    databaseAdapter: IDatabaseAdapter;

    /**
     * Authentication token used for securing requests.
     */
    token: string | null;

    /**
     * Custom actions that the agent can perform.
     */
    actions: Action[] = [];

    /**
     * Evaluators used to assess and guide the agent's responses.
     */
    evaluators: Evaluator[] = [];

    /**
     * Context providers used to provide context for message generation.
     */
    providers: Provider[] = [];

    plugins: Plugin[] = [];

    /**
     * The model to use for generateText.
     */
    modelProvider: ModelProviderName;

    /**
     * The model to use for generateImage.
     */
    imageModelProvider: ModelProviderName;

    /**
     * Fetch function to use
     * Some environments may not have access to the global fetch function and need a custom fetch override.
     */
    fetch = fetch;

    /**
     * The character to use for the agent
     */
    character: Character;

    /**
     * Store messages that are sent and received by the agent.
     */
    messageManager: IMemoryManager;

    /**
     * Store and recall descriptions of users based on conversations.
     */
    descriptionManager: IMemoryManager;

    /**
     * Manage the creation and recall of static information (documents, historical game lore, etc)
     */
    loreManager: IMemoryManager;

    /**
     * Hold large documents that can be referenced
     */
    documentsManager: IMemoryManager;

    /**
     * Searchable document fragments
     */
    knowledgeManager: IMemoryManager;

    services: Map<ServiceType, Service> = new Map();
    memoryManagers: Map<string, IMemoryManager> = new Map();
    cacheManager: ICacheManager;

    registerMemoryManager(manager: IMemoryManager): void {
        if (!manager.tableName) {
            throw new Error("Memory manager must have a tableName");
        }

        if (this.memoryManagers.has(manager.tableName)) {
            okaiLogger.warn(
                `Memory manager ${manager.tableName} is already registered. Skipping registration.`
            );
            return;
        }

        this.memoryManagers.set(manager.tableName, manager);
    }

    getMemoryManager(tableName: string): IMemoryManager | null {
        return this.memoryManagers.get(tableName) || null;
    }

    getService<T extends Service>(service: ServiceType): T | null {
        const serviceInstance = this.services.get(service);
        if (!serviceInstance) {
            okaiLogger.error(`Service ${service} not found`);
            return null;
        }
        return serviceInstance as T;
    }

    async registerService(service: Service): Promise<void> {
        const serviceType = service.serviceType;
        okaiLogger.log("Registering service:", serviceType);

        if (this.services.has(serviceType)) {
            okaiLogger.warn(
                `Service ${serviceType} is already registered. Skipping registration.`
            );
            return;
        }

        // Add the service to the services map
        this.services.set(serviceType, service);
        okaiLogger.success(`Service ${serviceType} registered successfully`);
    }

    /**
     * Creates an instance of AgentRuntime.
     * @param opts - The options for configuring the AgentRuntime.
     * @param opts.conversationLength - The number of messages to hold in the recent message cache.
     * @param opts.token - The JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker.
     * @param opts.serverUrl - The URL of the worker.
     * @param opts.actions - Optional custom actions.
     * @param opts.evaluators - Optional custom evaluators.
     * @param opts.services - Optional custom services.
     * @param opts.memoryManagers - Optional custom memory managers.
     * @param opts.providers - Optional context providers.
     * @param opts.model - The model to use for generateText.
     * @param opts.embeddingModel - The model to use for embedding.
     * @param opts.agentId - Optional ID of the agent.
     * @param opts.databaseAdapter - The database adapter used for interacting with the database.
     * @param opts.fetch - Custom fetch function to use for making requests.
     */

    constructor(opts: {
        conversationLength?: number; // number of messages to hold in the recent message cache
        agentId?: UUID; // ID of the agent
        character?: Character; // The character to use for the agent
        token: string; // JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker
        serverUrl?: string; // The URL of the worker
        actions?: Action[]; // Optional custom actions
        evaluators?: Evaluator[]; // Optional custom evaluators
        plugins?: Plugin[];
        providers?: Provider[];
        modelProvider: ModelProviderName;

        services?: Service[]; // Map of service name to service instance
        managers?: IMemoryManager[]; // Map of table name to memory manager
        databaseAdapter: IDatabaseAdapter; // The database adapter used for interacting with the database
        fetch?: typeof fetch | unknown;
        speechModelPath?: string;
        cacheManager: ICacheManager;
        logging?: boolean;
    }) {
        okaiLogger.info("Initializing AgentRuntime with options:", {
            character: opts.character?.name,
            modelProvider: opts.modelProvider,
            characterModelProvider: opts.character?.modelProvider,
        });

        this.#conversationLength =
            opts.conversationLength ?? this.#conversationLength;
        this.databaseAdapter = opts.databaseAdapter;
        // use the character id if it exists, otherwise use the agentId if it is passed in, otherwise use the character name
        this.agentId =
            opts.character?.id ??
            opts?.agentId ??
            stringToUuid(opts.character?.name ?? uuidv4());
        this.character = opts.character || defaultCharacter;

        // By convention, we create a user and room using the agent id.
        // Memories related to it are considered global context for the agent.
        this.ensureRoomExists(this.agentId);
        this.ensureUserExists(
            this.agentId,
            this.character.name,
            this.character.name
        );
        this.ensureParticipantExists(this.agentId, this.agentId);

        okaiLogger.success("Agent ID", this.agentId);

        this.fetch = (opts.fetch as typeof fetch) ?? this.fetch;
        if (!opts.databaseAdapter) {
            throw new Error("No database adapter provided");
        }

        this.cacheManager = opts.cacheManager;

        this.messageManager = new MemoryManager({
            runtime: this,
            tableName: "messages",
        });

        this.descriptionManager = new MemoryManager({
            runtime: this,
            tableName: "descriptions",
        });

        this.loreManager = new MemoryManager({
            runtime: this,
            tableName: "lore",
        });

        this.documentsManager = new MemoryManager({
            runtime: this,
            tableName: "documents",
        });

        this.knowledgeManager = new MemoryManager({
            runtime: this,
            tableName: "fragments",
        });

        (opts.managers ?? []).forEach((manager: IMemoryManager) => {
            this.registerMemoryManager(manager);
        });

        (opts.services ?? []).forEach((service: Service) => {
            this.registerService(service);
        });

        this.serverUrl = opts.serverUrl ?? this.serverUrl;

        okaiLogger.info("Setting model provider...");
        okaiLogger.info("Model Provider Selection:", {
            characterModelProvider: this.character.modelProvider,
            optsModelProvider: opts.modelProvider,
            currentModelProvider: this.modelProvider,
            finalSelection:
                this.character.modelProvider ??
                opts.modelProvider ??
                this.modelProvider,
        });

        this.modelProvider =
            this.character.modelProvider ??
            opts.modelProvider ??
            this.modelProvider;

        this.imageModelProvider =
            this.character.imageModelProvider ?? this.modelProvider;

        okaiLogger.info("Selected model provider:", this.modelProvider);
        okaiLogger.info(
            "Selected image model provider:",
            this.imageModelProvider
        );

        // Validate model provider
        if (!Object.values(ModelProviderName).includes(this.modelProvider)) {
            okaiLogger.error("Invalid model provider:", this.modelProvider);
            okaiLogger.error(
                "Available providers:",
                Object.values(ModelProviderName)
            );
            throw new Error(`Invalid model provider: ${this.modelProvider}`);
        }

        if (!this.serverUrl) {
            okaiLogger.warn("No serverUrl provided, defaulting to localhost");
        }

        this.token = opts.token;

        this.plugins = [
            ...(opts.character?.plugins ?? []),
            ...(opts.plugins ?? []),
        ];

        this.plugins.forEach((plugin) => {
            plugin.actions?.forEach((action) => {
                this.registerAction(action);
            });

            plugin.evaluators?.forEach((evaluator) => {
                this.registerEvaluator(evaluator);
            });

            plugin.services?.forEach((service) => {
                this.registerService(service);
            });

            plugin.providers?.forEach((provider) => {
                this.registerContextProvider(provider);
            });
        });

        (opts.actions ?? []).forEach((action) => {
            this.registerAction(action);
        });

        (opts.providers ?? []).forEach((provider) => {
            this.registerContextProvider(provider);
        });

        (opts.evaluators ?? []).forEach((evaluator: Evaluator) => {
            this.registerEvaluator(evaluator);
        });
    }

    async initialize() {
        for (const [serviceType, service] of this.services.entries()) {
            try {
                await service.initialize(this);
                this.services.set(serviceType, service);
                okaiLogger.success(
                    `Service ${serviceType} initialized successfully`
                );
            } catch (error) {
                okaiLogger.error(
                    `Failed to initialize service ${serviceType}:`,
                    error
                );
                throw error;
            }
        }

        for (const plugin of this.plugins) {
            if (plugin.services)
                await Promise.all(
                    plugin.services?.map((service) => service.initialize(this))
                );
        }

        if (
            this.character &&
            this.character.knowledge &&
            this.character.knowledge.length > 0
        ) {
            await this.processCharacterKnowledge(this.character.knowledge);
        }
    }

    /**
     * Processes character knowledge by creating document memories and fragment memories.
     * This function takes an array of knowledge items, creates a document memory for each item if it doesn't exist,
     * then chunks the content into fragments, embeds each fragment, and creates fragment memories.
     * @param knowledge An array of knowledge items containing id, path, and content.
     */
    private async processCharacterKnowledge(items: string[]) {
        for (const item of items) {
            const knowledgeId = stringToUuid(item);
            const existingDocument =
                await this.documentsManager.getMemoryById(knowledgeId);
            if (existingDocument) {
                continue;
            }

            okaiLogger.info(
                "Processing knowledge for ",
                this.character.name,
                " - ",
                item.slice(0, 100)
            );

            await knowledge.set(this, {
                id: knowledgeId,
                content: {
                    text: item,
                },
            });
        }
    }

    getSetting(key: string) {
        // check if the key is in the character.settings.secrets object
        if (this.character.settings?.secrets?.[key]) {
            return this.character.settings.secrets[key];
        }
        // if not, check if it's in the settings object
        if (this.character.settings?.[key]) {
            return this.character.settings[key];
        }

        // if not, check if it's in the settings object
        if (settings[key]) {
            return settings[key];
        }

        return null;
    }

    /**
     * Get the number of messages that are kept in the conversation buffer.
     * @returns The number of recent messages to be kept in memory.
     */
    getConversationLength() {
        return this.#conversationLength;
    }

    /**
     * Register an action for the agent to perform.
     * @param action The action to register.
     */
    registerAction(action: Action) {
        okaiLogger.success(`Registering action: ${action.name}`);
        this.actions.push(action);
    }

    /**
     * Register an evaluator to assess and guide the agent's responses.
     * @param evaluator The evaluator to register.
     */
    registerEvaluator(evaluator: Evaluator) {
        this.evaluators.push(evaluator);
    }

    /**
     * Register a context provider to provide context for message generation.
     * @param provider The context provider to register.
     */
    registerContextProvider(provider: Provider) {
        this.providers.push(provider);
    }

    /**
     * Process the actions of a message.
     * @param message The message to process.
     * @param content The content of the message to process actions from.
     */
    async processActions(
        message: Memory,
        responses: Memory[],
        state?: State,
        callback?: HandlerCallback
    ): Promise<void> {
        if (!responses[0].content?.action) {
            okaiLogger.warn("No action found in the response content.");
            return;
        }

        const normalizedAction = responses[0].content.action
            .toLowerCase()
            .replace("_", "");

        okaiLogger.success(`Normalized action: ${normalizedAction}`);

        let action = this.actions.find(
            (a: { name: string }) =>
                a.name
                    .toLowerCase()
                    .replace("_", "")
                    .includes(normalizedAction) ||
                normalizedAction.includes(a.name.toLowerCase().replace("_", ""))
        );

        if (!action) {
            okaiLogger.info("Attempting to find action in similes.");
            for (const _action of this.actions) {
                const simileAction = _action.similes.find(
                    (simile) =>
                        simile
                            .toLowerCase()
                            .replace("_", "")
                            .includes(normalizedAction) ||
                        normalizedAction.includes(
                            simile.toLowerCase().replace("_", "")
                        )
                );
                if (simileAction) {
                    action = _action;
                    okaiLogger.success(
                        `Action found in similes: ${action.name}`
                    );
                    break;
                }
            }
        }

        if (!action) {
            okaiLogger.error(
                "No action found for",
                responses[0].content.action
            );
            return;
        }

        if (!action.handler) {
            okaiLogger.error(`Action ${action.name} has no handler.`);
            return;
        }

        try {
            okaiLogger.info(`Executing handler for action: ${action.name}`);
            await action.handler(this, message, state, {}, callback);
        } catch (error) {
            okaiLogger.error(error);
        }
    }

    /**
     * Evaluate the message and state using the registered evaluators.
     * @param message The message to evaluate.
     * @param state The state of the agent.
     * @param didRespond Whether the agent responded to the message.
     * @returns The results of the evaluation.
     */
    async evaluate(message: Memory, state?: State, didRespond?: boolean) {
        const evaluatorPromises = this.evaluators.map(
            async (evaluator: Evaluator) => {
                okaiLogger.log("Evaluating", evaluator.name);
                if (!evaluator.handler) {
                    return null;
                }
                if (!didRespond && !evaluator.alwaysRun) {
                    return null;
                }
                const result = await evaluator.validate(this, message, state);
                if (result) {
                    return evaluator;
                }
                return null;
            }
        );

        const resolvedEvaluators = await Promise.all(evaluatorPromises);
        const evaluatorsData = resolvedEvaluators.filter(Boolean);

        // if there are no evaluators this frame, return
        if (evaluatorsData.length === 0) {
            return [];
        }

        const evaluators = formatEvaluators(evaluatorsData as Evaluator[]);
        const evaluatorNames = formatEvaluatorNames(
            evaluatorsData as Evaluator[]
        );

        const context = composeContext({
            state: {
                ...state,
                evaluators,
                evaluatorNames,
            } as State,
            template:
                this.character.templates?.evaluationTemplate ||
                evaluationTemplate,
        });

        const result = await generateText({
            runtime: this,
            context,
            modelClass: ModelClass.SMALL,
        });

        const parsedResult = parseJsonArrayFromText(
            result
        ) as unknown as string[];

        this.evaluators
            .filter((evaluator: Evaluator) =>
                parsedResult?.includes(evaluator.name)
            )
            .forEach((evaluator: Evaluator) => {
                if (!evaluator?.handler) return;

                evaluator.handler(this, message);
            });

        return parsedResult;
    }

    /**
     * Ensure the existence of a participant in the room. If the participant does not exist, they are added to the room.
     * @param userId - The user ID to ensure the existence of.
     * @throws An error if the participant cannot be added.
     */
    async ensureParticipantExists(userId: UUID, roomId: UUID) {
        const participants =
            await this.databaseAdapter.getParticipantsForAccount(userId);

        if (participants?.length === 0) {
            await this.databaseAdapter.addParticipant(userId, roomId);
        }
    }

    /**
     * Ensure the existence of a user in the database. If the user does not exist, they are added to the database.
     * @param userId - The user ID to ensure the existence of.
     * @param userName - The user name to ensure the existence of.
     * @returns
     */

    async ensureUserExists(
        userId: UUID,
        userName: string | null,
        name: string | null,
        email?: string | null,
        source?: string | null
    ) {
        const account = await this.databaseAdapter.getAccountById(userId);
        if (!account) {
            await this.databaseAdapter.createAccount({
                id: userId,
                name: name || userName || "Unknown User",
                username: userName || name || "Unknown",
                email: email || (userName || "Bot") + "@" + source || "Unknown", // Temporary
                details: { summary: "" },
            });
            okaiLogger.success(`User ${userName} created successfully.`);
        }
    }

    async ensureParticipantInRoom(userId: UUID, roomId: UUID) {
        const participants =
            await this.databaseAdapter.getParticipantsForRoom(roomId);
        if (!participants.includes(userId)) {
            await this.databaseAdapter.addParticipant(userId, roomId);
            if (userId === this.agentId) {
                okaiLogger.log(
                    `Agent ${this.character.name} linked to room ${roomId} successfully.`
                );
            } else {
                okaiLogger.log(
                    `User ${userId} linked to room ${roomId} successfully.`
                );
            }
        }
    }

    async ensureConnection(
        userId: UUID,
        roomId: UUID,
        userName?: string,
        userScreenName?: string,
        source?: string
    ) {
        await Promise.all([
            this.ensureUserExists(
                this.agentId,
                this.character.name ?? "Agent",
                this.character.name ?? "Agent",
                source
            ),
            this.ensureUserExists(
                userId,
                userName ?? "User" + userId,
                userScreenName ?? "User" + userId,
                source
            ),
            this.ensureRoomExists(roomId),
        ]);

        await Promise.all([
            this.ensureParticipantInRoom(userId, roomId),
            this.ensureParticipantInRoom(this.agentId, roomId),
        ]);
    }

    /**
     * Ensure the existence of a room between the agent and a user. If no room exists, a new room is created and the user
     * and agent are added as participants. The room ID is returned.
     * @param userId - The user ID to create a room with.
     * @returns The room ID of the room between the agent and the user.
     * @throws An error if the room cannot be created.
     */
    async ensureRoomExists(roomId: UUID) {
        const room = await this.databaseAdapter.getRoom(roomId);
        if (!room) {
            await this.databaseAdapter.createRoom(roomId);
            okaiLogger.log(`Room ${roomId} created successfully.`);
        }
    }

    /**
     * Compose the state of the agent into an object that can be passed or used for response generation.
     * @param message The message to compose the state from.
     * @returns The state of the agent.
     */
    async composeState(
        message: Memory,
        additionalKeys: { [key: string]: unknown } = {}
    ) {
        const { userId, roomId } = message;

        const conversationLength = this.getConversationLength();

        const [actorsData, recentMessagesData, goalsData]: [
            Actor[],
            Memory[],
            Goal[],
        ] = await Promise.all([
            getActorDetails({ runtime: this, roomId }),
            this.messageManager.getMemories({
                roomId,
                count: conversationLength,
                unique: false,
            }),
            getGoals({
                runtime: this,
                count: 10,
                onlyInProgress: false,
                roomId,
            }),
        ]);

        const goals = formatGoalsAsString({ goals: goalsData });

        const actors = formatActors({ actors: actorsData ?? [] });

        const recentMessages = formatMessages({
            messages: recentMessagesData,
            actors: actorsData,
        });

        const recentPosts = formatPosts({
            messages: recentMessagesData,
            actors: actorsData,
            conversationHeader: false,
        });

        // const lore = formatLore(loreData);

        const senderName = actorsData?.find(
            (actor: Actor) => actor.id === userId
        )?.name;

        // TODO: We may wish to consolidate and just accept character.name here instead of the actor name
        const agentName =
            actorsData?.find((actor: Actor) => actor.id === this.agentId)
                ?.name || this.character.name;

        let allAttachments = message.content.attachments || [];

        if (recentMessagesData && Array.isArray(recentMessagesData)) {
            const lastMessageWithAttachment = recentMessagesData.find(
                (msg) =>
                    msg.content.attachments &&
                    msg.content.attachments.length > 0
            );

            if (lastMessageWithAttachment) {
                const lastMessageTime = lastMessageWithAttachment.createdAt;
                const oneHourBeforeLastMessage =
                    lastMessageTime - 60 * 60 * 1000; // 1 hour before last message

                allAttachments = recentMessagesData
                    .reverse()
                    .map((msg) => {
                        const msgTime = msg.createdAt ?? Date.now();
                        const isWithinTime =
                            msgTime >= oneHourBeforeLastMessage;
                        const attachments = msg.content.attachments || [];
                        if (!isWithinTime) {
                            attachments.forEach((attachment) => {
                                attachment.text = "[Hidden]";
                            });
                        }
                        return attachments;
                    })
                    .flat();
            }
        }

        const formattedAttachments = allAttachments
            .map(
                (attachment) =>
                    `ID: ${attachment.id}
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Text: ${attachment.text}
  `
            )
            .join("\n");

        // randomly get 3 bits of lore and join them into a paragraph, divided by \n
        let lore = "";
        // Assuming this.lore is an array of lore bits
        if (this.character.lore && this.character.lore.length > 0) {
            const shuffledLore = [...this.character.lore].sort(
                () => Math.random() - 0.5
            );
            const selectedLore = shuffledLore.slice(0, 10);
            lore = selectedLore.join("\n");
        }

        const formattedCharacterPostExamples = this.character.postExamples
            .sort(() => 0.5 - Math.random())
            .map((post) => {
                const messageString = `${post}`;
                return messageString;
            })
            .slice(0, 50)
            .join("\n");

        const formattedCharacterMessageExamples = this.character.messageExamples
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map((example) => {
                const exampleNames = Array.from({ length: 5 }, () =>
                    uniqueNamesGenerator({ dictionaries: [names] })
                );

                return example
                    .map((message) => {
                        let messageString = `${message.user}: ${message.content.text}`;
                        exampleNames.forEach((name, index) => {
                            const placeholder = `{{user${index + 1}}}`;
                            messageString = messageString.replaceAll(
                                placeholder,
                                name
                            );
                        });
                        return messageString;
                    })
                    .join("\n");
            })
            .join("\n\n");

        const getRecentInteractions = async (
            userA: UUID,
            userB: UUID
        ): Promise<Memory[]> => {
            // Find all rooms where userA and userB are participants
            const rooms = await this.databaseAdapter.getRoomsForParticipants([
                userA,
                userB,
            ]);

            // Check the existing memories in the database
            const existingMemories =
                await this.messageManager.getMemoriesByRoomIds({
                    // filter out the current room id from rooms
                    roomIds: rooms.filter((room) => room !== roomId),
                });

            // Sort messages by timestamp in descending order
            existingMemories.sort((a, b) => b.createdAt - a.createdAt);

            // Take the most recent messages
            const recentInteractionsData = existingMemories.slice(0, 20);
            return recentInteractionsData;
        };

        const recentInteractions =
            userId !== this.agentId
                ? await getRecentInteractions(userId, this.agentId)
                : [];

        const getRecentMessageInteractions = async (
            recentInteractionsData: Memory[]
        ): Promise<string> => {
            // Format the recent messages
            const formattedInteractions = await Promise.all(
                recentInteractionsData.map(async (message) => {
                    const isSelf = message.userId === this.agentId;
                    let sender: string;
                    if (isSelf) {
                        sender = this.character.name;
                    } else {
                        const accountId =
                            await this.databaseAdapter.getAccountById(
                                message.userId
                            );
                        sender = accountId?.username || "unknown";
                    }
                    return `${sender}: ${message.content.text}`;
                })
            );

            return formattedInteractions.join("\n");
        };

        const formattedMessageInteractions =
            await getRecentMessageInteractions(recentInteractions);

        const getRecentPostInteractions = async (
            recentInteractionsData: Memory[],
            actors: Actor[]
        ): Promise<string> => {
            const formattedInteractions = formatPosts({
                messages: recentInteractionsData,
                actors,
                conversationHeader: true,
            });

            return formattedInteractions;
        };

        const formattedPostInteractions = await getRecentPostInteractions(
            recentInteractions,
            actorsData
        );

        // if bio is a string, use it. if its an array, pick one at random
        let bio = this.character.bio || "";
        if (Array.isArray(bio)) {
            // get three random bio strings and join them with " "
            bio = bio
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .join(" ");
        }

        const knowledegeData = await knowledge.get(this, message);

        const formattedKnowledge = formatKnowledge(knowledegeData);

        const initialState = {
            agentId: this.agentId,
            agentName,
            bio,
            lore,
            adjective:
                this.character.adjectives &&
                this.character.adjectives.length > 0
                    ? this.character.adjectives[
                          Math.floor(
                              Math.random() * this.character.adjectives.length
                          )
                      ]
                    : "",
            knowledge: formattedKnowledge,
            knowledgeData: knowledegeData,
            // Recent interactions between the sender and receiver, formatted as messages
            recentMessageInteractions: formattedMessageInteractions,
            // Recent interactions between the sender and receiver, formatted as posts
            recentPostInteractions: formattedPostInteractions,
            // Raw memory[] array of interactions
            recentInteractionsData: recentInteractions,
            // randomly pick one topic
            topic:
                this.character.topics && this.character.topics.length > 0
                    ? this.character.topics[
                          Math.floor(
                              Math.random() * this.character.topics.length
                          )
                      ]
                    : null,
            topics:
                this.character.topics && this.character.topics.length > 0
                    ? `${this.character.name} is interested in ` +
                      this.character.topics
                          .sort(() => 0.5 - Math.random())
                          .slice(0, 5)
                          .map((topic, index) => {
                              if (index === this.character.topics.length - 2) {
                                  return topic + " and ";
                              }
                              // if last topic, don't add a comma
                              if (index === this.character.topics.length - 1) {
                                  return topic;
                              }
                              return topic + ", ";
                          })
                          .join("")
                    : "",
            characterPostExamples:
                formattedCharacterPostExamples &&
                formattedCharacterPostExamples.replaceAll("\n", "").length > 0
                    ? addHeader(
                          `# Example Posts for ${this.character.name}`,
                          formattedCharacterPostExamples
                      )
                    : "",
            characterMessageExamples:
                formattedCharacterMessageExamples &&
                formattedCharacterMessageExamples.replaceAll("\n", "").length >
                    0
                    ? addHeader(
                          `# Example Conversations for ${this.character.name}`,
                          formattedCharacterMessageExamples
                      )
                    : "",
            messageDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.chat.length > 0
                    ? addHeader(
                          "# Message Directions for " + this.character.name,
                          (() => {
                              const all = this.character?.style?.all || [];
                              const chat = this.character?.style?.chat || [];
                              return [...all, ...chat].join("\n");
                          })()
                      )
                    : "",

            postDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.post.length > 0
                    ? addHeader(
                          "# Post Directions for " + this.character.name,
                          (() => {
                              const all = this.character?.style?.all || [];
                              const post = this.character?.style?.post || [];
                              return [...all, ...post].join("\n");
                          })()
                      )
                    : "",

            //old logic left in for reference
            //food for thought. how could we dynamically decide what parts of the character to add to the prompt other than random? rag? prompt the llm to decide?
            /*
            postDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.post.length > 0
                    ? addHeader(
                            "# Post Directions for " + this.character.name,
                            (() => {
                                const all = this.character?.style?.all || [];
                                const post = this.character?.style?.post || [];
                                const shuffled = [...all, ...post].sort(
                                    () => 0.5 - Math.random()
                                );
                                return shuffled
                                    .slice(0, conversationLength / 2)
                                    .join("\n");
                            })()
                        )
                    : "",*/
            // Agent runtime stuff
            senderName,
            actors:
                actors && actors.length > 0
                    ? addHeader("# Actors", actors)
                    : "",
            actorsData,
            roomId,
            goals:
                goals && goals.length > 0
                    ? addHeader(
                          "# Goals\n{{agentName}} should prioritize accomplishing the objectives that are in progress.",
                          goals
                      )
                    : "",
            goalsData,
            recentMessages:
                recentMessages && recentMessages.length > 0
                    ? addHeader("# Conversation Messages", recentMessages)
                    : "",
            recentPosts:
                recentPosts && recentPosts.length > 0
                    ? addHeader("# Posts in Thread", recentPosts)
                    : "",
            recentMessagesData,
            attachments:
                formattedAttachments && formattedAttachments.length > 0
                    ? addHeader("# Attachments", formattedAttachments)
                    : "",
            ...additionalKeys,
        } as State;

        const actionPromises = this.actions.map(async (action: Action) => {
            const result = await action.validate(this, message, initialState);
            if (result) {
                return action;
            }
            return null;
        });

        const evaluatorPromises = this.evaluators.map(async (evaluator) => {
            const result = await evaluator.validate(
                this,
                message,
                initialState
            );
            if (result) {
                return evaluator;
            }
            return null;
        });

        const [resolvedEvaluators, resolvedActions, providers] =
            await Promise.all([
                Promise.all(evaluatorPromises),
                Promise.all(actionPromises),
                getProviders(this, message, initialState),
            ]);

        const evaluatorsData = resolvedEvaluators.filter(
            Boolean
        ) as Evaluator[];
        const actionsData = resolvedActions.filter(Boolean) as Action[];

        const actionState = {
            actionNames:
                "Possible response actions: " + formatActionNames(actionsData),
            actions:
                actionsData.length > 0
                    ? addHeader(
                          "# Available Actions",
                          formatActions(actionsData)
                      )
                    : "",
            actionExamples:
                actionsData.length > 0
                    ? addHeader(
                          "# Action Examples",
                          composeActionExamples(actionsData, 10)
                      )
                    : "",
            evaluatorsData,
            evaluators:
                evaluatorsData.length > 0
                    ? formatEvaluators(evaluatorsData)
                    : "",
            evaluatorNames:
                evaluatorsData.length > 0
                    ? formatEvaluatorNames(evaluatorsData)
                    : "",
            evaluatorExamples:
                evaluatorsData.length > 0
                    ? formatEvaluatorExamples(evaluatorsData)
                    : "",
            providers: addHeader(
                `# Additional Information About ${this.character.name} and The World`,
                providers
            ),
        };

        return { ...initialState, ...actionState } as State;
    }

    async updateRecentMessageState(state: State): Promise<State> {
        const conversationLength = this.getConversationLength();
        const recentMessagesData = await this.messageManager.getMemories({
            roomId: state.roomId,
            count: conversationLength,
            unique: false,
        });

        const recentMessages = formatMessages({
            actors: state.actorsData ?? [],
            messages: recentMessagesData.map((memory: Memory) => {
                const newMemory = { ...memory };
                delete newMemory.embedding;
                return newMemory;
            }),
        });

        let allAttachments = [];

        if (recentMessagesData && Array.isArray(recentMessagesData)) {
            const lastMessageWithAttachment = recentMessagesData.find(
                (msg) =>
                    msg.content.attachments &&
                    msg.content.attachments.length > 0
            );

            if (lastMessageWithAttachment) {
                const lastMessageTime = lastMessageWithAttachment.createdAt;
                const oneHourBeforeLastMessage =
                    lastMessageTime - 60 * 60 * 1000; // 1 hour before last message

                allAttachments = recentMessagesData
                    .filter((msg) => {
                        const msgTime = msg.createdAt;
                        return msgTime >= oneHourBeforeLastMessage;
                    })
                    .flatMap((msg) => msg.content.attachments || []);
            }
        }

        const formattedAttachments = allAttachments
            .map(
                (attachment) =>
                    `ID: ${attachment.id}
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Text: ${attachment.text}
    `
            )
            .join("\n");

        return {
            ...state,
            recentMessages: addHeader(
                "# Conversation Messages",
                recentMessages
            ),
            recentMessagesData,
            attachments: formattedAttachments,
        } as State;
    }
}

const formatKnowledge = (knowledge: KnowledgeItem[]) => {
    return knowledge
        .map((knowledge) => `- ${knowledge.content.text}`)
        .join("\n");
};
