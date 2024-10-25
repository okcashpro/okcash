// clients/telegram/messageManager.ts

import { Message } from '@telegraf/types';
import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';

import { composeContext } from '../../../core/context.ts';
import { log_to_file } from '../../../core/logger.ts';
import { embeddingZeroVector } from '../../../core/memory.ts';
import {
  Content,
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from '../../../core/types.ts';
import { stringToUuid } from '../../../core/uuid.ts';
import { messageHandlerTemplate } from '../../discord/templates.ts';

const MAX_MESSAGE_LENGTH = 4096; // Telegram's max message length

export class MessageManager {
  private bot: Telegraf<Context>;
  private runtime: IAgentRuntime;

  constructor(bot: Telegraf<Context>, runtime: IAgentRuntime) {
    this.bot = bot;
    this.runtime = runtime;
  }

  public async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.from) {
      console.log("❌ Invalid message or sender");
      return;
    }

    if (!('text' in ctx.message)) {
      console.log("❌ Not a text message");
      return;
    }

    const message = ctx.message as Message.TextMessage;
    console.log("🔍 Processing message:", message.text);

    try {
      const userId = stringToUuid(ctx.from.id.toString()) as UUID;
      const userName = ctx.from.username || ctx.from.first_name || 'Unknown User';
      const chatId = stringToUuid(ctx.chat?.id.toString()) as UUID;
      const agentId = this.runtime.agentId;
      const roomId = chatId;

      // Ensure users and room exist
      await Promise.all([
        this.runtime.ensureUserExists(
          agentId,
          this.bot.botInfo?.username || 'Bot',
          this.runtime.character.name,
          'telegram'
        ),
        this.runtime.ensureUserExists(userId, userName, userName, 'telegram'),
        this.runtime.ensureRoomExists(roomId),
        this.runtime.ensureParticipantInRoom(userId, roomId),
        this.runtime.ensureParticipantInRoom(agentId, roomId),
      ]);

      const messageId = stringToUuid(message.message_id.toString()) as UUID;

      // Check for duplicate message
      const existingMessage = await this.runtime.messageManager.getMemoryById(messageId);
      if (existingMessage && existingMessage.content.text === message.text) {
        return;
      }

      const content: Content = {
        text: message.text,
        source: 'telegram',
        inReplyTo: message.reply_to_message
          ? stringToUuid(message.reply_to_message.message_id.toString())
          : undefined,
      };

      const memory: Memory = {
        id: messageId,
        userId,
        roomId,
        content,
        createdAt: message.date * 1000,
        embedding: embeddingZeroVector,
      };

      await this.runtime.messageManager.createMemory(memory);

      let state = await this.runtime.composeState(memory);
      state = await this.runtime.updateRecentMessageState(state);

      const responseContent = await this._generateResponse(memory, state);
      
      if (!responseContent || !responseContent.text) {
        console.log("❌ No response generated");
        return;
      }

      console.log("📤 Sending response:", responseContent.text);

      // Split message if it's too long
      const chunks = this.splitMessage(responseContent.text);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const sentMessage = await ctx.telegram.sendMessage(ctx.chat.id, chunk, {
          reply_parameters: i === 0 ? { 
            message_id: message.message_id,
            chat_id: ctx.chat.id
          } : undefined
        });

        // Save bot's response as memory
        if (sentMessage) {
          const botMemory: Memory = {
            id: stringToUuid(sentMessage.message_id.toString()) as UUID,
            userId: agentId,
            roomId,
            content: {
              text: chunk,
              source: 'telegram',
              inReplyTo: messageId,
              action: chunks.length > 1 && i < chunks.length - 1 ? 'CONTINUE' : undefined,
            },
            createdAt: Date.now(),
            embedding: embeddingZeroVector,
          };

          await this.runtime.messageManager.createMemory(botMemory);
        }
      }

      // Update state after response
      state = await this.runtime.updateRecentMessageState(state);
      await this.runtime.evaluate(memory, state);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await ctx.reply('Sorry, I encountered an error while processing your request.');
    }
  }

  private splitMessage(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
        currentChunk += (currentChunk ? '\n' : '') + line;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = line;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private async _generateResponse(message: Memory, state: State): Promise<Content> {
    const { userId, roomId } = message;
    const datestr = new Date().toUTCString().replace(/:/g, "-");

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    log_to_file(
      `${state.agentName}_${datestr}_telegram_message_context`,
      context,
    );

    const response = await this.runtime.messageCompletion({
      context,
      stop: ['<|eot|>'],
      temperature: 0.7,
      serverUrl: this.runtime.getSetting("X_SERVER_URL") ?? this.runtime.serverUrl,
      token: this.runtime.getSetting("XAI_API_KEY") ?? this.runtime.token,
      model: this.runtime.getSetting("XAI_MODEL") ? this.runtime.getSetting("XAI_MODEL") : "gpt-4o-mini",
    });

    if (!response) {
      console.error("❌ No response from runtime.messageCompletion");
      return null;
    }

    log_to_file(
      `${state.agentName}_${datestr}_telegram_message_response`,
      JSON.stringify(response),
    );

    await this.runtime.databaseAdapter.log({
      body: { message, context, response },
      userId: userId,
      roomId,
      type: "response",
    });

    return response;
  }
}