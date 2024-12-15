import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    messageCompletionFooter,
    shouldRespondFooter,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    stringToUuid,
    elizaLogger,
    getEmbeddingZeroVector,
} from "@ai16z/eliza";
import { EchoChamberClient } from "./echoChamberClient";
import { ChatMessage } from "./types";

function createMessageTemplate(currentRoom: string, roomTopic: string) {
    return (
        `
# About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

Current Room: ${currentRoom}
Room Topic: ${roomTopic}

{{messageDirections}}

Recent conversation history:
{{recentMessages}}

Thread Context:
{{formattedConversation}}

# Task: Generate a response in the voice and style of {{agentName}} while:
1. Staying relevant to the room's topic
2. Maintaining conversation context
3. Being helpful but not overly talkative
4. Responding naturally to direct questions or mentions
5. Contributing meaningfully to ongoing discussions

Remember:
- Keep responses concise and focused
- Stay on topic for the current room
- Don't repeat information already shared
- Be natural and conversational
` + messageCompletionFooter
    );
}

function createShouldRespondTemplate(currentRoom: string, roomTopic: string) {
    return (
        `
# About {{agentName}}:
{{bio}}
{{knowledge}}

Current Room: ${currentRoom}
Room Topic: ${roomTopic}

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} should:
- RESPOND when:
  * Directly mentioned or asked a question
  * Can contribute relevant expertise to the discussion
  * Topic aligns with their knowledge and background
  * Conversation is active and engaging

- IGNORE when:
  * Message is not relevant to their expertise
  * Already responded recently without new information to add
  * Conversation has moved to a different topic
  * Message is too short or lacks substance
  * Other participants are handling the discussion well

- STOP when:
  * Asked to stop participating
  * Conversation has concluded
  * Discussion has completely diverged from their expertise
  * Room topic has changed significantly

Recent messages:
{{recentMessages}}

Thread Context:
{{formattedConversation}}

# Task: Choose whether {{agentName}} should respond to the last message.
Consider:
1. Message relevance to {{agentName}}'s expertise
2. Current conversation context
3. Time since last response
4. Value of potential contribution
` + shouldRespondFooter
    );
}

export class InteractionClient {
    private client: EchoChamberClient;
    private runtime: IAgentRuntime;
    private lastCheckedTimestamps: Map<string, string> = new Map();
    private lastResponseTimes: Map<string, number> = new Map();
    private messageThreads: Map<string, ChatMessage[]> = new Map();
    private messageHistory: Map<
        string,
        { message: ChatMessage; response: ChatMessage | null }[]
    > = new Map();
    private pollInterval: NodeJS.Timeout | null = null;

    constructor(client: EchoChamberClient, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
    }

    async start() {
        const pollInterval = Number(
            this.runtime.getSetting("ECHOCHAMBERS_POLL_INTERVAL") || 60
        );

        const handleInteractionsLoop = () => {
            this.handleInteractions();
            this.pollInterval = setTimeout(
                handleInteractionsLoop,
                pollInterval * 1000
            );
        };

        handleInteractionsLoop();
    }

    async stop() {
        if (this.pollInterval) {
            clearTimeout(this.pollInterval);
            this.pollInterval = null;
        }
    }

    private async buildMessageThread(
        message: ChatMessage,
        messages: ChatMessage[]
    ): Promise<ChatMessage[]> {
        const thread: ChatMessage[] = [];
        const maxThreadLength = Number(
            this.runtime.getSetting("ECHOCHAMBERS_MAX_MESSAGES") || 10
        );

        // Start with the current message
        thread.push(message);

        // Get recent messages in the same room, ordered by timestamp
        const roomMessages = messages
            .filter((msg) => msg.roomId === message.roomId)
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            );

        // Add recent messages to provide context
        for (const msg of roomMessages) {
            if (thread.length >= maxThreadLength) break;
            if (msg.id !== message.id) {
                thread.unshift(msg);
            }
        }

        return thread;
    }

    private shouldProcessMessage(
        message: ChatMessage,
        room: { topic: string }
    ): boolean {
        const modelInfo = this.client.getModelInfo();

        // Don't process own messages
        if (message.sender.username === modelInfo.username) {
            return false;
        }

        // Check if we've processed this message before
        const lastChecked =
            this.lastCheckedTimestamps.get(message.roomId) || "0";
        if (message.timestamp <= lastChecked) {
            return false;
        }

        // Check rate limiting for responses
        const lastResponseTime =
            this.lastResponseTimes.get(message.roomId) || 0;
        const minTimeBetweenResponses = 30000; // 30 seconds
        if (Date.now() - lastResponseTime < minTimeBetweenResponses) {
            return false;
        }

        // Check if message mentions the agent
        const isMentioned = message.content
            .toLowerCase()
            .includes(`${modelInfo.username.toLowerCase()}`);

        // Check if message is relevant to room topic
        const isRelevantToTopic =
            room.topic &&
            message.content.toLowerCase().includes(room.topic.toLowerCase());

        // Always process if mentioned, otherwise check relevance
        return isMentioned || isRelevantToTopic;
    }

    private async handleInteractions() {
        elizaLogger.log("Checking EchoChambers interactions");

        try {
            const defaultRoom = this.runtime.getSetting(
                "ECHOCHAMBERS_DEFAULT_ROOM"
            );
            const rooms = await this.client.listRooms();

            for (const room of rooms) {
                // Only process messages from the default room if specified
                if (defaultRoom && room.id !== defaultRoom) {
                    continue;
                }

                const messages = await this.client.getRoomHistory(room.id);
                this.messageThreads.set(room.id, messages);

                // Get only the most recent message that we should process
                const latestMessages = messages
                    .filter((msg) => !this.shouldProcessMessage(msg, room)) // Fixed: Now filtering out messages we shouldn't process
                    .sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                    );

                if (latestMessages.length > 0) {
                    const latestMessage = latestMessages[0];
                    await this.handleMessage(latestMessage, room.topic);

                    // Update history
                    const roomHistory = this.messageHistory.get(room.id) || [];
                    roomHistory.push({
                        message: latestMessage,
                        response: null, // Will be updated when we respond
                    });
                    this.messageHistory.set(room.id, roomHistory);

                    // Update last checked timestamp
                    if (
                        latestMessage.timestamp >
                        (this.lastCheckedTimestamps.get(room.id) || "0")
                    ) {
                        this.lastCheckedTimestamps.set(
                            room.id,
                            latestMessage.timestamp
                        );
                    }
                }
            }

            elizaLogger.log("Finished checking EchoChambers interactions");
        } catch (error) {
            elizaLogger.error(
                "Error handling EchoChambers interactions:",
                error
            );
        }
    }

    private async handleMessage(message: ChatMessage, roomTopic: string) {
        try {
            const roomId = stringToUuid(message.roomId);
            const userId = stringToUuid(message.sender.username);

            // Ensure connection exists
            await this.runtime.ensureConnection(
                userId,
                roomId,
                message.sender.username,
                message.sender.username,
                "echochambers"
            );

            // Build message thread for context
            const thread = await this.buildMessageThread(
                message,
                this.messageThreads.get(message.roomId) || []
            );

            // Create memory object
            const memory: Memory = {
                id: stringToUuid(message.id),
                userId,
                agentId: this.runtime.agentId,
                roomId,
                content: {
                    text: message.content,
                    source: "echochambers",
                    thread: thread.map((msg) => ({
                        text: msg.content,
                        sender: msg.sender.username,
                        timestamp: msg.timestamp,
                    })),
                },
                createdAt: new Date(message.timestamp).getTime(),
                embedding: getEmbeddingZeroVector(),
            };

            // Check if we've already processed this message
            const existing = await this.runtime.messageManager.getMemoryById(
                memory.id
            );
            if (existing) {
                elizaLogger.log(
                    `Already processed message ${message.id}, skipping`
                );
                return;
            }

            // Save the message to memory
            await this.runtime.messageManager.createMemory(memory);

            // Compose state with thread context
            let state = await this.runtime.composeState(memory);
            state = await this.runtime.updateRecentMessageState(state);

            // Decide whether to respond
            const shouldRespondContext = composeContext({
                state,
                template:
                    this.runtime.character.templates?.shouldRespondTemplate ||
                    createShouldRespondTemplate(message.roomId, roomTopic),
            });

            const shouldRespond = await generateShouldRespond({
                runtime: this.runtime,
                context: shouldRespondContext,
                modelClass: ModelClass.SMALL,
            });

            if (shouldRespond !== "RESPOND") {
                elizaLogger.log(
                    `Not responding to message ${message.id}: ${shouldRespond}`
                );
                return;
            }

            // Generate response
            const responseContext = composeContext({
                state,
                template:
                    this.runtime.character.templates?.messageHandlerTemplate ||
                    createMessageTemplate(message.roomId, roomTopic),
            });

            const response = await generateMessageResponse({
                runtime: this.runtime,
                context: responseContext,
                modelClass: ModelClass.LARGE,
            });

            if (!response || !response.text) {
                elizaLogger.log("No response generated");
                return;
            }

            // Send response
            const callback: HandlerCallback = async (content: Content) => {
                const sentMessage = await this.client.sendMessage(
                    message.roomId,
                    content.text
                );

                // Update last response time
                this.lastResponseTimes.set(message.roomId, Date.now());

                // Update history with our response
                const roomHistory =
                    this.messageHistory.get(message.roomId) || [];
                const lastEntry = roomHistory[roomHistory.length - 1];
                if (lastEntry && lastEntry.message.id === message.id) {
                    lastEntry.response = sentMessage;
                }

                const responseMemory: Memory = {
                    id: stringToUuid(sentMessage.id),
                    userId: this.runtime.agentId,
                    agentId: this.runtime.agentId,
                    roomId,
                    content: {
                        text: sentMessage.content,
                        source: "echochambers",
                        action: content.action,
                        thread: thread.map((msg) => ({
                            text: msg.content,
                            sender: msg.sender.username,
                            timestamp: msg.timestamp,
                        })),
                    },
                    createdAt: new Date(sentMessage.timestamp).getTime(),
                    embedding: getEmbeddingZeroVector(),
                };

                await this.runtime.messageManager.createMemory(responseMemory);
                return [responseMemory];
            };

            // Send the response and process any resulting actions
            const responseMessages = await callback(response);
            state = await this.runtime.updateRecentMessageState(state);
            await this.runtime.processActions(
                memory,
                responseMessages,
                state,
                callback
            );
            await this.runtime.evaluate(memory, state, true);
        } catch (error) {
            elizaLogger.error("Error handling message:", error);
        }
    }
}
