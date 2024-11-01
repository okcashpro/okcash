import { ChannelType, Client, Message as DiscordMessage } from "discord.js";
import { composeContext } from "../../core/context.ts";
import { log_to_file } from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import {
    Content,
    HandlerCallback,
    IAgentRuntime,
    Media,
    Memory,
    ModelClass,
    State,
    UUID,
} from "../../core/types.ts";
import { generateSummary } from "../../services/summary.ts";
import { AttachmentManager } from "./attachments.ts";
import { messageHandlerTemplate, shouldRespondTemplate } from "./templates.ts";
import { InterestChannels } from "./types.ts";

import { TextChannel } from "discord.js";
import { stringToUuid } from "../../core/uuid.ts";
import { SpeechService } from "../../services/speech.ts";
import { VoiceManager } from "./voice.ts";
import {
    generateMessageResponse,
    generateShouldRespond,
} from "../../core/generation.ts";

const MAX_MESSAGE_LENGTH = 1900;

export async function sendMessageInChunks(
    channel: TextChannel,
    content: string,
    inReplyTo: string,
    files: any[]
): Promise<DiscordMessage[]> {
    const sentMessages: DiscordMessage[] = [];
    const messages = splitMessage(content);

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (
            message.trim().length > 0 ||
            (i === messages.length - 1 && files && files.length > 0)
        ) {
            const options: any = {
                content: message.trim(),
            };

            // if (i === 0 && inReplyTo) {
            //   // Reply to the specified message for the first chunk
            //   options.reply = {
            //     messageReference: inReplyTo,
            //   };
            // }

            if (i === messages.length - 1 && files && files.length > 0) {
                // Attach files to the last message chunk
                options.files = files;
            }

            const m = await channel.send(options);
            sentMessages.push(m);
        }
    }

    return sentMessages;
}

function splitMessage(content: string): string[] {
    const messages: string[] = [];
    let currentMessage = "";

    const rawLines = content?.split("\n") || [];
    // split all lines into MAX_MESSAGE_LENGTH chunks so any long lines are split
    const lines = rawLines
        .map((line) => {
            const chunks = [];
            while (line.length > MAX_MESSAGE_LENGTH) {
                chunks.push(line.slice(0, MAX_MESSAGE_LENGTH));
                line = line.slice(MAX_MESSAGE_LENGTH);
            }
            chunks.push(line);
            return chunks;
        })
        .flat();

    for (const line of lines) {
        if (currentMessage.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
            messages.push(currentMessage.trim());
            currentMessage = "";
        }
        currentMessage += line + "\n";
    }

    if (currentMessage.trim().length > 0) {
        messages.push(currentMessage.trim());
    }

    return messages;
}

export class MessageManager {
    private client: Client;
    private runtime: IAgentRuntime;
    private attachmentManager: AttachmentManager;
    private interestChannels: InterestChannels = {};
    private discordClient: any;
    private voiceManager: VoiceManager;

    constructor(discordClient: any, voiceManager: VoiceManager) {
        this.client = discordClient.client;
        this.voiceManager = voiceManager;
        this.discordClient = discordClient;
        this.runtime = discordClient.runtime;
        this.attachmentManager = new AttachmentManager(this.runtime);
    }

    async handleMessage(message: DiscordMessage) {
        if (
            message.interaction ||
            message.author.id ===
                this.client.user?.id /* || message.author?.bot*/
        )
            return;
        const userId = message.author.id as UUID;
        const userName = message.author.username;
        const name = message.author.displayName;
        const channelId = message.channel.id;

        try {
            const { processedContent, attachments } =
                await this.processMessageMedia(message);

            const audioAttachments = message.attachments.filter((attachment) =>
                attachment.contentType?.startsWith("audio/")
            );
            if (audioAttachments.size > 0) {
                const processedAudioAttachments =
                    await this.attachmentManager.processAttachments(
                        audioAttachments
                    );
                attachments.push(...processedAudioAttachments);
            }

            const roomId = stringToUuid(channelId);
            const userIdUUID = stringToUuid(userId);

            await this.runtime.ensureConnection(
                userIdUUID,
                roomId,
                userName,
                name,
                "discord"
            );

            const messageId = stringToUuid(message.id);

            // Check if the message already exists in the cache or database
            const existingMessage =
                await this.runtime.messageManager.getMemoryById(messageId);

            if (existingMessage) {
                // If the message content is the same, return early
                if (existingMessage.content.text === message.content) {
                    return;
                }
            }

            let shouldIgnore = false;
            let shouldRespond = true;

            const content: Content = {
                text: processedContent,
                attachments: attachments,
                source: "discord",
                url: message.url,
                inReplyTo: message.reference?.messageId
                    ? stringToUuid(message.reference.messageId)
                    : undefined,
            };

            const userMessage = { content, userId: userIdUUID, roomId };

            let state = (await this.runtime.composeState(userMessage, {
                discordClient: this.client,
                discordMessage: message,
                agentName:
                    this.runtime.character.name ||
                    this.client.user?.displayName,
            })) as State;

            const memory: Memory = {
                id: stringToUuid(message.id),
                ...userMessage,
                userId: userIdUUID,
                roomId,
                content,
                createdAt: message.createdTimestamp,
                embedding: embeddingZeroVector,
            };

            if (content.text) {
                await this.runtime.messageManager.createMemory(memory);
            }

            state = await this.runtime.updateRecentMessageState(state);

            if (!shouldIgnore) {
                shouldIgnore = await this._shouldIgnore(message);
            }

            if (shouldIgnore) {
                return;
            }
            const hasInterest = this._checkInterest(channelId);

            const agentUserState =
                await this.runtime.databaseAdapter.getParticipantUserState(
                    roomId,
                    this.runtime.agentId
                );

            if (
                agentUserState === "MUTED" &&
                !message.mentions.has(this.client.user.id) &&
                !hasInterest
            ) {
                console.log("Ignoring muted room");
                // Ignore muted rooms unless explicitly mentioned
                return;
            }

            if (agentUserState === "FOLLOWED") {
                shouldRespond = true; // Always respond in followed rooms
            } else if (
                (!shouldRespond && hasInterest) ||
                (shouldRespond && !hasInterest)
            ) {
                console.log("Checking if should respond");
                shouldRespond = await this._shouldRespond(message, state);
            }

            if (!shouldRespond) {
                return;
            }

            console.log("Responding");

            const context = composeContext({
                state,
                template: messageHandlerTemplate,
            });

            const responseContent = await this._generateResponse(
                memory,
                state,
                context
            );

            responseContent.text = responseContent.text?.trim();
            responseContent.inReplyTo = stringToUuid(message.id);

            if (!responseContent.text) {
                return;
            }

            const callback: HandlerCallback = async (
                content: Content,
                files: any[]
            ) => {
                if (message.id && !content.inReplyTo) {
                    content.inReplyTo = stringToUuid(message.id);
                }
                if (message.channel.type === ChannelType.GuildVoice) {
                    // For voice channels, use text-to-speech
                    const audioStream = await SpeechService.generate(
                        this.runtime,
                        content.text
                    );
                    await this.voiceManager.playAudioStream(
                        userId,
                        audioStream
                    );
                    const memory: Memory = {
                        id: stringToUuid(message.id),
                        userId: this.runtime.agentId,
                        content,
                        roomId,
                        embedding: embeddingZeroVector,
                    };
                    return [memory];
                } else {
                    // For text channels, send the message
                    const messages = await sendMessageInChunks(
                        message.channel as TextChannel,
                        content.text,
                        message.id,
                        files
                    );
                    let notFirstMessage = false;
                    const memories: Memory[] = [];
                    for (const m of messages) {
                        let action = content.action;
                        // If there's only one message or it's the last message, keep the original action
                        // For multiple messages, set all but the last to 'CONTINUE'
                        if (
                            messages.length > 1 &&
                            m !== messages[messages.length - 1]
                        ) {
                            action = "CONTINUE";
                        }

                        notFirstMessage = true;
                        const memory: Memory = {
                            id: stringToUuid(m.id),
                            userId: this.runtime.agentId,
                            content: {
                                ...content,
                                action,
                                inReplyTo: messageId,
                                url: m.url,
                            },
                            roomId,
                            embedding: embeddingZeroVector,
                            createdAt: m.createdTimestamp,
                        };
                        memories.push(memory);
                    }
                    for (const m of memories) {
                        await this.runtime.messageManager.createMemory(m);
                    }
                    return memories;
                }
            };

            const responseMessages = await callback(responseContent);

            state = await this.runtime.updateRecentMessageState(state);

            await this.runtime.evaluate(memory, state);

            await this.runtime.processActions(
                memory,
                responseMessages,
                state,
                callback
            );
        } catch (error) {
            console.error("Error handling message:", error);
            if (message.channel.type === ChannelType.GuildVoice) {
                // For voice channels, use text-to-speech for the error message
                const errorMessage = "Sorry, I had a glitch. What was that?";
                const audioStream = await SpeechService.generate(
                    this.runtime,
                    errorMessage
                );
                await this.voiceManager.playAudioStream(userId, audioStream);
            } else {
                // For text channels, send the error message
                await message.reply(
                    "Sorry, I encountered an error while processing your request."
                );
            }
        }
    }

    async cacheMessages(channel: TextChannel, count: number = 20) {
        const messages = await channel.messages.fetch({ limit: count });
        for (const [_, message] of messages) {
            await this.handleMessage(message);
        }
    }

    async processMessageMedia(
        message: DiscordMessage
    ): Promise<{ processedContent: string; attachments: Media[] }> {
        let processedContent = message.content;
        let attachments: Media[] = [];

        // Process code blocks in the message content
        const codeBlockRegex = /```([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(processedContent))) {
            const codeBlock = match[1];
            const lines = codeBlock.split("\n");
            const title = lines[0];
            const description = lines.slice(0, 3).join("\n");
            const attachmentId =
                `code-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(
                    -5
                );
            attachments.push({
                id: attachmentId,
                url: "",
                title: title || "Code Block",
                source: "Code",
                description: description,
                text: codeBlock,
            });
            processedContent = processedContent.replace(
                match[0],
                `Code Block (${attachmentId})`
            );
        }

        // Process message attachments
        if (message.attachments.size > 0) {
            attachments = await this.attachmentManager.processAttachments(
                message.attachments
            );
        }

        // TODO: Move to attachments manager
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = processedContent.match(urlRegex) || [];

        for (const url of urls) {
            if (this.runtime.videoService.isVideoUrl(url)) {
                const videoInfo =
                    await this.runtime.videoService.processVideo(url);
                attachments.push({
                    id: `youtube-${Date.now()}`,
                    url: url,
                    title: videoInfo.title,
                    source: "YouTube",
                    description: videoInfo.description,
                    text: videoInfo.text,
                });
            } else {
                const { title, bodyContent } =
                    await this.runtime.browserService.getPageContent(url);
                const { title: newTitle, description } = await generateSummary(
                    this.runtime,
                    title + "\n" + bodyContent
                );
                attachments.push({
                    id: `webpage-${Date.now()}`,
                    url: url,
                    title: newTitle || "Web Page",
                    source: "Web",
                    description,
                    text: bodyContent,
                });
            }
        }

        return { processedContent, attachments };
    }

    private _checkInterest(channelId: string): boolean {
        return !!this.interestChannels[channelId];
    }

    private async _shouldIgnore(message: DiscordMessage): Promise<boolean> {
        // if the message is from us, ignore
        if (message.author.id === this.client.user?.id) return true;
        let messageContent = message.content.toLowerCase();

        // Replace the bot's @ping with the character name
        const botMention = `<@!?${this.client.user?.id}>`;
        messageContent = messageContent.replace(
            new RegExp(botMention, "gi"),
            this.runtime.character.name.toLowerCase()
        );

        // Replace the bot's username with the character name
        const botUsername = this.client.user?.username.toLowerCase();
        messageContent = messageContent.replace(
            new RegExp(`\\b${botUsername}\\b`, "g"),
            this.runtime.character.name.toLowerCase()
        );

        // strip all special characters
        messageContent = messageContent.replace(/[^a-zA-Z0-9\s]/g, "");

        // short responses where ruby should stop talking and disengage unless mentioned again
        const loseInterestWords = [
            "shut up",
            "stop",
            "please shut up",
            "shut up please",
            "dont talk",
            "silence",
            "stop talking",
            "be quiet",
            "hush",
            "wtf",
            "chill",
            "stfu",
            "stupid bot",
            "dumb bot",
            "stop responding",
            "god damn it",
            "god damn",
            "goddamnit",
            "can you not",
            "can you stop",
            "be quiet",
            "hate you",
            "hate this",
            "fuck up",
        ];
        if (
            messageContent.length < 100 &&
            loseInterestWords.some((word) => messageContent.includes(word))
        ) {
            delete this.interestChannels[message.channelId];
            return true;
        }

        // If we're not interested in the channel and it's a short message, ignore it
        if (
            messageContent.length < 10 &&
            !this.interestChannels[message.channelId]
        ) {
            return true;
        }

        const targetedPhrases = [
            this.runtime.character.name + " stop responding",
            this.runtime.character.name + " stop talking",
            this.runtime.character.name + " shut up",
            this.runtime.character.name + " stfu",
            "stop talking" + this.runtime.character.name,
            this.runtime.character.name + " stop talking",
            "shut up " + this.runtime.character.name,
            this.runtime.character.name + " shut up",
            "stfu " + this.runtime.character.name,
            this.runtime.character.name + " stfu",
            "chill" + this.runtime.character.name,
            this.runtime.character.name + " chill",
        ];

        // lose interest if pinged and told to stop responding
        if (targetedPhrases.some((phrase) => messageContent.includes(phrase))) {
            delete this.interestChannels[message.channelId];
            return true;
        }

        // if the message is short, ignore but maintain interest
        if (
            !this.interestChannels[message.channelId] &&
            messageContent.length < 2
        ) {
            return true;
        }

        const ignoreResponseWords = [
            "lol",
            "nm",
            "uh",
            "wtf",
            "stfu",
            "dumb",
            "jfc",
            "omg",
        ];
        if (
            message.content.length < 4 &&
            ignoreResponseWords.some((word) =>
                message.content.toLowerCase().includes(word)
            )
        ) {
            return true;
        }
        return false;
    }

    private async _shouldRespond(
        message: DiscordMessage,
        state: State
    ): Promise<boolean> {
        if (message.author.id === this.client.user?.id) return false;
        // if (message.author.bot) return false;
        if (message.mentions.has(this.client.user?.id as string)) return true;

        const guild = message.guild;
        const member = guild?.members.cache.get(this.client.user?.id as string);
        const nickname = member?.nickname;

        if (
            message.content
                .toLowerCase()
                .includes(this.client.user?.username.toLowerCase() as string) ||
            message.content
                .toLowerCase()
                .includes(this.client.user?.tag.toLowerCase() as string) ||
            (nickname &&
                message.content.toLowerCase().includes(nickname.toLowerCase()))
        ) {
            return true;
        }

        if (!message.guild) {
            return true;
        }

        // If none of the above conditions are met, use the generateText to decide
        const shouldRespondContext = composeContext({
            state,
            template: shouldRespondTemplate,
        });

        const response = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL,
        });

        if (response === "RESPOND") {
            return true;
        } else if (response === "IGNORE") {
            return false;
        } else if (response === "STOP") {
            delete this.interestChannels[message.channelId];
            return false;
        } else {
            console.error(
                "Invalid response from response generateText:",
                response
            );
            return false;
        }
    }

    private async _generateResponse(
        message: Memory,
        state: State,
        context: string
    ): Promise<Content> {
        const { userId, roomId } = message;

        const datestr = new Date().toUTCString().replace(/:/g, "-");

        // log context to file
        log_to_file(
            `${state.agentName}_${datestr}_discord_message_context`,
            context
        );

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!response) {
            console.error("No response from generateMessageResponse");
            return;
        }

        log_to_file(
            `${state.agentName}_${datestr}_discord_message_response`,
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

    async fetchBotName(botToken: string) {
        const url = "https://discord.com/api/v10/users/@me";

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Error fetching bot details: ${response.statusText}`
            );
        }

        const data = await response.json();
        return data.username;
    }
}
