import { Message } from "@telegraf/types";
import { Context } from "telegraf";
import { Telegraf } from "telegraf";

import { composeContext } from "../../../core/context.ts";
import { log_to_file } from "../../../core/logger.ts";
import { embeddingZeroVector } from "../../../core/memory.ts";
import {
    Content,
    IAgentRuntime,
    Memory,
    State,
    UUID,
    HandlerCallback,
    ModelClass,
} from "../../../core/types.ts";
import { stringToUuid } from "../../../core/uuid.ts";
import {
    messageHandlerTemplate,
    shouldRespondTemplate,
} from "../../discord/templates.ts";
import ImageDescriptionService from "../../../services/image.ts";
import {
    generateMessageResponse,
    generateShouldRespond,
} from "../../../core/generation.ts";

const MAX_MESSAGE_LENGTH = 4096; // Telegram's max message length

export class MessageManager {
    private bot: Telegraf<Context>;
    private runtime: IAgentRuntime;
    private imageService: ImageDescriptionService;

    constructor(bot: Telegraf<Context>, runtime: IAgentRuntime) {
        this.bot = bot;
        this.runtime = runtime;
        this.imageService = ImageDescriptionService.getInstance(this.runtime);
    }

    // Process image messages and generate descriptions
    private async processImage(
        message: Message
    ): Promise<{ description: string } | null> {
        // console.log(
        //     "🖼️ Processing image message:",
        //     JSON.stringify(message, null, 2)
        // );

        try {
            let imageUrl: string | null = null;

            // Handle photo messages
            if ("photo" in message && message.photo?.length > 0) {
                const photo = message.photo[message.photo.length - 1];
                const fileLink = await this.bot.telegram.getFileLink(
                    photo.file_id
                );
                imageUrl = fileLink.toString();
            }
            // Handle image documents
            else if (
                "document" in message &&
                message.document?.mime_type?.startsWith("image/")
            ) {
                const doc = message.document;
                const fileLink = await this.bot.telegram.getFileLink(
                    doc.file_id
                );
                imageUrl = fileLink.toString();
            }

            if (imageUrl) {
                const { title, description } =
                    await this.imageService.describeImage(imageUrl);
                const fullDescription = `[Image: ${title}\n${description}]`;
                return { description: fullDescription };
            }
        } catch (error) {
            console.error("❌ Error processing image:", error);
        }

        return null; // No image found
    }

    // Decide if the bot should respond to the message
    private async _shouldRespond(
        message: Message,
        state: State
    ): Promise<boolean> {
        // Respond if bot is mentioned

        if (
            "text" in message &&
            message.text?.includes(`@${this.bot.botInfo?.username}`)
        ) {
            return true;
        }

        // Respond to private chats
        if (message.chat.type === "private") {
            return true;
        }

        // Respond to images in group chats
        if (
            "photo" in message ||
            ("document" in message &&
                message.document?.mime_type?.startsWith("image/"))
        ) {
            return false;
        }

        // Use AI to decide for text or captions
        if ("text" in message || ("caption" in message && message.caption)) {
            const shouldRespondContext = composeContext({
                state,
                template: shouldRespondTemplate,
            });

            const response = await generateShouldRespond({
                runtime: this.runtime,
                context: shouldRespondContext,
                modelClass: ModelClass.SMALL,
            });

            return response === "RESPOND";
        }

        return false; // No criteria met
    }

    // Send long messages in chunks
    private async sendMessageInChunks(
        ctx: Context,
        content: string,
        replyToMessageId?: number
    ): Promise<Message.TextMessage[]> {
        const chunks = this.splitMessage(content);
        const sentMessages: Message.TextMessage[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const sentMessage = (await ctx.telegram.sendMessage(
                ctx.chat.id,
                chunk,
                {
                    reply_parameters:
                        i === 0 && replyToMessageId
                            ? { message_id: replyToMessageId }
                            : undefined,
                }
            )) as Message.TextMessage;

            sentMessages.push(sentMessage);
        }

        return sentMessages;
    }

    // Split message into smaller parts
    private splitMessage(text: string): string[] {
        const chunks: string[] = [];
        let currentChunk = "";

        const lines = text.split("\n");
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
                currentChunk += (currentChunk ? "\n" : "") + line;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
            }
        }

        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    // Generate a response using AI
    private async _generateResponse(
        message: Memory,
        state: State,
        context: string
    ): Promise<Content> {
        const { userId, roomId } = message;
        const datestr = new Date().toUTCString().replace(/:/g, "-");

        log_to_file(
            `${state.agentName}_${datestr}_telegram_message_context`,
            context
        );

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!response) {
            console.error("❌ No response from generateMessageResponse");
            return null;
        }

        log_to_file(
            `${state.agentName}_${datestr}_telegram_message_response`,
            JSON.stringify(response)
        );

        await this.runtime.databaseAdapter.log({
            body: { message, context, response },
            userId: userId,
            roomId,
            type: "response",
        });

        return response;
    }

    // Main handler for incoming messages
    public async handleMessage(ctx: Context): Promise<void> {
        if (!ctx.message || !ctx.from) {
            return; // Exit if no message or sender info
        }

        // TODO: Handle commands?
        // if (ctx.message.text?.startsWith("/")) {
        //     return;
        // }

        const message = ctx.message;

        try {
            // Convert IDs to UUIDs
            const userId = stringToUuid(ctx.from.id.toString()) as UUID;
            const userName =
                ctx.from.username || ctx.from.first_name || "Unknown User";
            const chatId = stringToUuid(ctx.chat?.id.toString()) as UUID;
            const agentId = this.runtime.agentId;
            const roomId = chatId;

            await this.runtime.ensureConnection(
                userId,
                roomId,
                userName,
                userName,
                "telegram"
            );

            const messageId = stringToUuid(
                message.message_id.toString()
            ) as UUID;

            // Handle images
            const imageInfo = await this.processImage(message);

            // Get text or caption
            let messageText = "";
            if ("text" in message) {
                messageText = message.text;
            } else if ("caption" in message && message.caption) {
                messageText = message.caption;
            }

            // Combine text and image description
            const fullText = imageInfo
                ? `${messageText} ${imageInfo.description}`
                : messageText;

            if (!fullText) {
                return; // Skip if no content
            }

            const content: Content = {
                text: fullText,
                source: "telegram",
                inReplyTo:
                    "reply_to_message" in message && message.reply_to_message
                        ? stringToUuid(
                              message.reply_to_message.message_id.toString()
                          )
                        : undefined,
            };

            // Create memory for the message
            const memory: Memory = {
                id: messageId,
                agentId,
                userId,
                roomId,
                content,
                createdAt: message.date * 1000,
                embedding: embeddingZeroVector,
            };

            await this.runtime.messageManager.createMemory(memory);

            // Update state with the new memory
            let state = await this.runtime.composeState(memory);
            state = await this.runtime.updateRecentMessageState(state);

            // Decide whether to respond
            const shouldRespond = await this._shouldRespond(message, state);
            if (!shouldRespond) return;

            // Generate response
            const context = composeContext({
                state,
                template: messageHandlerTemplate,
            });

            const responseContent = await this._generateResponse(
                memory,
                state,
                context
            );

            if (!responseContent || !responseContent.text) return;

            // Send response in chunks
            const callback: HandlerCallback = async (content: Content) => {
                const sentMessages = await this.sendMessageInChunks(
                    ctx,
                    content.text,
                    message.message_id
                );

                const memories: Memory[] = [];

                // Create memories for each sent message
                for (let i = 0; i < sentMessages.length; i++) {
                    const sentMessage = sentMessages[i];
                    const isLastMessage = i === sentMessages.length - 1;

                    const memory: Memory = {
                        id: stringToUuid(sentMessage.message_id.toString()),
                        agentId,
                        userId,
                        roomId,
                        content: {
                            ...content,
                            text: sentMessage.text,
                            action: !isLastMessage ? "CONTINUE" : undefined,
                            inReplyTo: messageId,
                        },
                        createdAt: sentMessage.date * 1000,
                        embedding: embeddingZeroVector,
                    };

                    await this.runtime.messageManager.createMemory(memory);
                    memories.push(memory);
                }

                return memories;
            };

            // Execute callback to send messages and log memories
            const responseMessages = await callback(responseContent);

            // Update state after response
            state = await this.runtime.updateRecentMessageState(state);
            await this.runtime.evaluate(memory, state);

            // Handle any resulting actions
            await this.runtime.processActions(
                memory,
                responseMessages,
                state,
                callback
            );
        } catch (error) {
            console.error("❌ Error handling message:", error);
            await ctx.reply(
                "Sorry, I encountered an error while processing your request."
            );
        }
    }
}
