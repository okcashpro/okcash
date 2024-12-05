import { 
    stringToUuid, 
    getEmbeddingZeroVector, 
    composeContext, 
    generateMessageResponse,
    generateShouldRespond,
    ModelClass,
    Memory,
    Content,
    State,
    elizaLogger,
    HandlerCallback
} from '@ai16z/eliza';
import { slackMessageHandlerTemplate, slackShouldRespondTemplate } from './templates';
import { WebClient } from '@slack/web-api';
import { IAgentRuntime } from '@ai16z/eliza';

export class MessageManager {
    private client: WebClient;
    private runtime: IAgentRuntime;
    private botUserId: string;
    private processedMessages: Map<string, number> = new Map();

    constructor(client: WebClient, runtime: IAgentRuntime, botUserId: string) {
        elizaLogger.log("📱 Initializing MessageManager...");
        this.client = client;
        this.runtime = runtime;
        this.botUserId = botUserId;
        elizaLogger.debug("MessageManager initialized with botUserId:", botUserId);

        // Clear old processed messages every hour
        setInterval(() => {
            const oneHourAgo = Date.now() - 3600000;
            for (const [key, timestamp] of this.processedMessages.entries()) {
                if (timestamp < oneHourAgo) {
                    this.processedMessages.delete(key);
                }
            }
        }, 3600000);
    }

    private cleanMessage(text: string): string {
        elizaLogger.debug("🧹 [CLEAN] Cleaning message text:", text);
        // Remove bot mention
        const cleaned = text.replace(new RegExp(`<@${this.botUserId}>`, 'g'), '').trim();
        elizaLogger.debug("✨ [CLEAN] Cleaned result:", cleaned);
        return cleaned;
    }

    private async _shouldRespond(message: any, state: State): Promise<boolean> {
        // Always respond to direct mentions
        if (message.type === 'app_mention' || message.text?.includes(`<@${this.botUserId}>`)) {
            return true;
        }

        // Always respond in direct messages
        if (message.channel_type === 'im') {
            return true;
        }

        // Use the shouldRespond template to decide
        const shouldRespondContext = composeContext({
            state,
            template: this.runtime.character.templates?.slackShouldRespondTemplate || 
                     this.runtime.character.templates?.shouldRespondTemplate || 
                     slackShouldRespondTemplate,
        });

        const response = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL,
        });

        return response === 'RESPOND';
    }

    private async _generateResponse(
        memory: Memory,
        state: State,
        context: string
    ): Promise<Content> {
        const { userId, roomId } = memory;

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!response) {
            elizaLogger.error("No response from generateMessageResponse");
            return {
                text: "I apologize, but I'm having trouble generating a response right now.",
                source: 'slack'
            };
        }

        await this.runtime.databaseAdapter.log({
            body: { memory, context, response },
            userId: userId,
            roomId,
            type: "response",
        });

        // If response includes a CONTINUE action but there's no direct mention or thread,
        // remove the action to prevent automatic continuation
        if (
            response.action === 'CONTINUE' && 
            !memory.content.text?.includes(`<@${this.botUserId}>`) &&
            !state.recentMessages?.includes(memory.id)
        ) {
            elizaLogger.debug("🛑 [CONTINUE] Removing CONTINUE action as message is not a direct interaction");
            delete response.action;
        }

        return response;
    }

    public async handleMessage(event: any) {
        elizaLogger.debug("📥 [DETAILED] Incoming message event:", JSON.stringify(event, null, 2));

        try {
            // Generate a unique key for this message that includes all relevant data
            const messageKey = `${event.channel}-${event.ts}-${event.type}-${event.text}`;
            const currentTime = Date.now();

            // Check if we've already processed this message
            if (this.processedMessages.has(messageKey)) {
                elizaLogger.debug("⏭️ [SKIP] Message already processed:", {
                    key: messageKey,
                    originalTimestamp: this.processedMessages.get(messageKey),
                    currentTime
                });
                return;
            }

            // Add to processed messages map with current timestamp
            this.processedMessages.set(messageKey, currentTime);
            elizaLogger.debug("✨ [NEW] Processing new message:", {
                key: messageKey,
                timestamp: currentTime
            });

            // Ignore messages from bots (including ourselves)
            if (event.bot_id || event.user === this.botUserId) {
                elizaLogger.debug("⏭️ [SKIP] Message from bot or self:", {
                    bot_id: event.bot_id,
                    user: event.user,
                    bot_user_id: this.botUserId
                });
                return;
            }

            // Clean the message text
            const cleanedText = this.cleanMessage(event.text || '');

            // Generate unique IDs for the conversation
            const roomId = stringToUuid(`${event.channel}-${this.runtime.agentId}`);
            const userId = stringToUuid(`${event.user}-${this.runtime.agentId}`);
            const messageId = stringToUuid(`${event.ts}-${this.runtime.agentId}`);

            elizaLogger.debug("🔑 [IDS] Generated conversation IDs:", {
                roomId,
                userId,
                messageId
            });

            // Ensure connection is established
            await this.runtime.ensureConnection(
                userId,
                roomId,
                event.user,
                event.user_name || event.user,
                'slack'
            );

            // Create memory for the message
            const content: Content = {
                text: cleanedText,
                source: 'slack',
                inReplyTo: event.thread_ts ? stringToUuid(`${event.thread_ts}-${this.runtime.agentId}`) : undefined
            };

            const memory: Memory = {
                id: messageId,
                userId,
                agentId: this.runtime.agentId,
                roomId,
                content,
                createdAt: new Date(parseFloat(event.ts) * 1000).getTime(),
                embedding: getEmbeddingZeroVector(),
            };

            // Add memory
            if (content.text) {
                elizaLogger.debug("💾 [MEMORY] Creating memory for message:", {
                    text: content.text,
                    messageId
                });
                await this.runtime.messageManager.createMemory(memory);
            }

            // Initial state composition
            let state = await this.runtime.composeState(
                { content, userId, agentId: this.runtime.agentId, roomId },
                {
                    slackClient: this.client,
                    slackEvent: event,
                    agentName: this.runtime.character.name,
                    senderName: event.user_name || event.user
                }
            );

            // Update state with recent messages
            state = await this.runtime.updateRecentMessageState(state);

            elizaLogger.debug("🔄 [STATE] Composed state:", {
                agentName: state.agentName,
                senderName: state.senderName,
                roomId: state.roomId,
                recentMessages: state.recentMessages?.length || 0
            });

            // Check if we should respond
            const shouldRespond = await this._shouldRespond(event, state);

            if (shouldRespond) {
                // Generate response using message handler template
                const context = composeContext({
                    state,
                    template: this.runtime.character.templates?.slackMessageHandlerTemplate || slackMessageHandlerTemplate,
                });

                const responseContent = await this._generateResponse(memory, state, context);

                elizaLogger.debug("📝 [RESPONSE] Generated response content:", {
                    hasText: !!responseContent?.text,
                    length: responseContent?.text?.length
                });

                if (responseContent?.text) {
                    // Create response memory
                    const responseMemory: Memory = {
                        id: stringToUuid(`${Date.now()}-${this.runtime.agentId}`),
                        userId: this.runtime.agentId,
                        agentId: this.runtime.agentId,
                        roomId,
                        content: {
                            ...responseContent,
                            inReplyTo: messageId,
                        },
                        createdAt: Date.now(),
                        embedding: getEmbeddingZeroVector(),
                    };

                    elizaLogger.debug("💾 [MEMORY] Storing response in memory");
                    await this.runtime.messageManager.createMemory(responseMemory);

                    // Send the response
                    elizaLogger.debug("📤 [SEND] Sending response to Slack:", {
                        channel: event.channel,
                        thread_ts: event.thread_ts,
                        text_length: responseContent.text.length
                    });

                    const callback: HandlerCallback = async (content: Content) => {
                        try {
                            const response = await this.client.chat.postMessage({
                                channel: event.channel,
                                text: content.text,
                                thread_ts: event.thread_ts
                            });
                            
                            const responseMemory: Memory = {
                                id: stringToUuid(`${response.ts}-${this.runtime.agentId}`),
                                userId: this.runtime.agentId,
                                agentId: this.runtime.agentId,
                                roomId,
                                content: {
                                    ...content,
                                    inReplyTo: messageId,
                                },
                                createdAt: Date.now(),
                                embedding: getEmbeddingZeroVector(),
                            };

                            await this.runtime.messageManager.createMemory(responseMemory);
                            return [responseMemory];
                        } catch (error) {
                            elizaLogger.error("Error sending message:", error);
                            return [];
                        }
                    };

                    const responseMessages = await callback(responseContent);

                    // Update state with new messages
                    state = await this.runtime.updateRecentMessageState(state);

                    // Process any actions
                    await this.runtime.processActions(
                        memory,
                        responseMessages,
                        state,
                        callback
                    );
                }
            }

            // Evaluate the interaction
            await this.runtime.evaluate(memory, state, shouldRespond);

        } catch (error) {
            elizaLogger.error("❌ [ERROR] Error handling message:", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            await this.client.chat.postMessage({
                channel: event.channel,
                text: "Sorry, I encountered an error processing your message.",
                thread_ts: event.thread_ts
            });
        }
    }
} 