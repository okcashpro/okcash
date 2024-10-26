// clients/telegram/src/index.ts

import { Context, Telegraf } from "telegraf";

import { IAgentRuntime } from "../../../core/types.ts";
import { MessageManager } from "./messageManager.ts";

export class TelegramClient {
  private bot: Telegraf<Context>;
  private runtime: IAgentRuntime;
  private messageManager: MessageManager;

  constructor(runtime: IAgentRuntime, botToken: string) {
    console.log("📱 Constructing new TelegramClient...");
    this.runtime = runtime;
    this.bot = new Telegraf(botToken);
    this.messageManager = new MessageManager(this.bot, this.runtime);

    console.log("Setting up message handler...");
    this.bot.on("message", async (ctx) => {
      try {
        if ("text" in ctx.message) {
          console.log("📥 Received message:", ctx.message.text);
          await this.messageManager.handleMessage(ctx);
        } else {
          console.log("❌ Received non-text message");
        }
      } catch (error) {
        console.error("❌ Error handling message:", error);
        await ctx.reply("An error occurred while processing your message.");
      }
    });

    this.bot.catch((err, ctx) => {
      console.error(`❌ Telegram Error for ${ctx.updateType}:`, err);
      ctx.reply("An unexpected error occurred. Please try again later.");
    });

    console.log("✅ TelegramClient constructor completed");
  }

  public async start(): Promise<void> {
    console.log("🚀 Starting Telegram bot...");
    try {
      await this.bot.launch({
        dropPendingUpdates: true,
      });
      console.log("✨ Telegram bot successfully launched and is running!");
      console.log(`Bot username: @${this.bot.botInfo?.username}`);

      // Graceful shutdown handlers
      const shutdownHandler = async (signal: string) => {
        console.log(
          `⚠️ Received ${signal}. Shutting down Telegram bot gracefully...`
        );
        try {
          await this.stop();
          console.log("🛑 Telegram bot stopped gracefully");
        } catch (error) {
          console.error("❌ Error during Telegram bot shutdown:", error);
          throw error;
        }
      };

      process.once("SIGINT", () => shutdownHandler("SIGINT"));
      process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
      process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
    } catch (error) {
      console.error("❌ Failed to launch Telegram bot:", error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log("Stopping Telegram bot...");
    await this.bot.stop();
    console.log("Telegram bot stopped");
  }
}
