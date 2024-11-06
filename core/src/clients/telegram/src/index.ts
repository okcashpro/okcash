import { Context, Telegraf } from "telegraf";

import { IAgentRuntime } from "../../../core/types.ts";
import { MessageManager } from "./messageManager.ts";
import { elizaLog } from "../../../index.ts";

export class TelegramClient {
    private bot: Telegraf<Context>;
    private runtime: IAgentRuntime;
    private messageManager: MessageManager;

    constructor(runtime: IAgentRuntime, botToken: string) {
        elizaLog.log("📱 Constructing new TelegramClient...");
        this.runtime = runtime;
        this.bot = new Telegraf(botToken);
        this.messageManager = new MessageManager(this.bot, this.runtime);

        elizaLog.log("Setting up message handler...");
        this.bot.on("message", async (ctx) => {
            try {
                elizaLog.log("📥 Received message:", ctx.message);
                await this.messageManager.handleMessage(ctx);
            } catch (error) {
                elizaLog.error("❌ Error handling message:", error);
                await ctx.reply(
                    "An error occurred while processing your message."
                );
            }
        });

        // Handle specific message types for better logging
        this.bot.on("photo", (ctx) => {
            elizaLog.log(
                "📸 Received photo message with caption:",
                ctx.message.caption
            );
        });

        this.bot.on("document", (ctx) => {
            elizaLog.log(
                "📎 Received document message:",
                ctx.message.document.file_name
            );
        });

        this.bot.catch((err, ctx) => {
            elizaLog.error(`❌ Telegram Error for ${ctx.updateType}:`, err);
            ctx.reply("An unexpected error occurred. Please try again later.");
        });

        elizaLog.log("✅ TelegramClient constructor completed");
    }

    public async start(): Promise<void> {
        elizaLog.log("🚀 Starting Telegram bot...");
        try {
            this.bot.launch({
                dropPendingUpdates: true,
            });
            elizaLog.log(
                "✨ Telegram bot successfully launched and is running!"
            );
            elizaLog.log(`Bot username: @${this.bot.botInfo?.username}`);

            // Graceful shutdown handlers
            const shutdownHandler = async (signal: string) => {
                elizaLog.log(
                    `⚠️ Received ${signal}. Shutting down Telegram bot gracefully...`
                );
                try {
                    await this.stop();
                    elizaLog.log("🛑 Telegram bot stopped gracefully");
                } catch (error) {
                    elizaLog.error(
                        "❌ Error during Telegram bot shutdown:",
                        error
                    );
                    throw error;
                }
            };

            process.once("SIGINT", () => shutdownHandler("SIGINT"));
            process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
            process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
        } catch (error) {
            elizaLog.error("❌ Failed to launch Telegram bot:", error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        elizaLog.log("Stopping Telegram bot...");
        await this.bot.stop();
        elizaLog.log("Telegram bot stopped");
    }
}
