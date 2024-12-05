import { WebClient } from '@slack/web-api';
import { elizaLogger } from '@ai16z/eliza';
import { IAgentRuntime, Memory, Content, State } from '@ai16z/eliza';
import { 
    stringToUuid, 
    getEmbeddingZeroVector, 
    composeContext, 
    generateMessageResponse, 
    generateShouldRespond,
    ModelClass 
} from '@ai16z/eliza';
import { slackMessageHandlerTemplate, slackShouldRespondTemplate } from './templates';

export class MessageManager {
    private client: WebClient;
    private runtime: IAgentRuntime;
    private botUserId: string;

    constructor(client: WebClient, runtime: IAgentRuntime, botUserId: string) {
        elizaLogger.log("📱 Initializing MessageManager...");
        this.client = client;
        this.runtime = runtime;
        this.botUserId = botUserId;
        elizaLogger.debug("MessageManager initialized with botUserId:", botUserId);
    }

    public async handleMessage(event: any) {
        elizaLogger.debug("📥 [DETAILED] Incoming message event:", JSON.stringify(event, null, 2));

        // Ignore messages from bots (including ourselves)
        if (event.bot_id || event.user === this.botUserId) {
            elizaLogger.debug("⏭️ [SKIP] Message from bot or self:", {
                bot_id: event.bot_id,
                user: event.user,
                bot_user_id: this.botUserId
            });
            return;
        }

        try {
            // Check if this is a direct mention or a message in a channel where the bot is mentioned
            const isMention = event.type === 'app_mention' || 
                            (event.text && event.text.includes(`<@${this.botUserId}>`));
            
            // Skip if it's not a mention and not in a direct message
            if (!isMention && event.channel_type !== 'im') {
                elizaLogger.debug("⏭️ [SKIP] Not a mention or direct message");
                return;
            }

            elizaLogger.debug("🎯 [CONTEXT] Message details:", {
                is_mention: isMention,
                channel_type: event.channel_type,
                thread_ts: event.thread_ts,
                text: event.text,
                channel: event.channel,
                subtype: event.subtype,
                event_type: event.type
            });

            // Clean the message text by removing the bot mention
            const cleanedText = this.cleanMessage(event.text || '');
            elizaLogger.debug("🧹 [CLEAN] Cleaned message text:", cleanedText);

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

            elizaLogger.debug("🔌 [CONNECTION] Connection ensured for user");

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

            // Compose state for response generation
            const state = await this.runtime.composeState(
                { content, userId, agentId: this.runtime.agentId, roomId },
                {
                    slackClient: this.client,
                    slackEvent: event,
                    agentName: this.runtime.character.name,
                    senderName: event.user_name || event.user
                }
            );

            elizaLogger.debug("🔄 [STATE] Composed state:", {
                agentName: state.agentName,
                senderName: state.senderName,
                roomId: state.roomId,
                recentMessages: state.recentMessages?.length || 0
            });

            // Always respond to direct mentions and direct messages
            const shouldRespond = isMention || event.channel_type === 'im' ? 'RESPOND' : 'IGNORE';
            
            elizaLogger.debug("✅ [DECISION] Should respond:", {
                decision: shouldRespond,
                isMention,
                channelType: event.channel_type
            });

            if (shouldRespond === 'RESPOND') {
                elizaLogger.debug("💭 [GENERATE] Generating response...");
                
                // Generate response using message handler template
                const context = composeContext({
                    state,
                    template: this.runtime.character.templates?.slackMessageHandlerTemplate || slackMessageHandlerTemplate,
                });

                const responseContent = await generateMessageResponse({
                    runtime: this.runtime,
                    context,
                    modelClass: ModelClass.SMALL,
                });

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

                    await this.sendMessage(event.channel, responseContent.text, event.thread_ts);
                    elizaLogger.debug("✉️ [SUCCESS] Response sent successfully");
                }
            } else {
                elizaLogger.debug("⏭️ [SKIP] Skipping response based on shouldRespond:", shouldRespond);
            }
        } catch (error) {
            elizaLogger.error("❌ [ERROR] Error handling message:", error);
            await this.sendMessage(
                event.channel,
                "Sorry, I encountered an error processing your message.",
                event.thread_ts
            );
        }
    }

    private cleanMessage(text: string): string {
        elizaLogger.debug("🧼 [CLEAN] Cleaning message:", text);
        // Remove mention of the bot
        const cleaned = text.replace(new RegExp(`<@${this.botUserId}>`, 'g'), '').trim();
        elizaLogger.debug("✨ [CLEAN] Cleaned result:", cleaned);
        return cleaned;
    }

    private async sendMessage(channel: string, text: string, thread_ts?: string) {
        elizaLogger.debug("📤 [SEND] Sending message:", {
            channel,
            text_length: text.length,
            thread_ts: thread_ts || 'none'
        });

        try {
            const response = await this.client.chat.postMessage({
                channel,
                text,
                thread_ts,
            });
            elizaLogger.debug("📨 [SEND] Message sent successfully:", {
                ts: response.ts,
                channel: response.channel,
                ok: response.ok
            });
            return response;
        } catch (error) {
            elizaLogger.error("❌ [ERROR] Failed to send message:", error);
            throw error;
        }
    }
} 