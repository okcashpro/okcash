import { Context, Telegraf } from "telegraf";
import { IAgentRuntime, okaiLogger } from "@okcashpro/okai";
import { MessageManager } from "./messageManager.ts";
import { getOrCreateRecommenderInBe } from "./getOrCreateRecommenderInBe.ts";

export class TelegramClient {
    private bot: Telegraf<Context>;
    private runtime: IAgentRuntime;
    private messageManager: MessageManager;
    private backend;
    private backendToken;
    private tgTrader;

    constructor(runtime: IAgentRuntime, botToken: string) {
        okaiLogger.log("📱 Constructing new TelegramClient...");
        this.runtime = runtime;
        this.bot = new Telegraf(botToken);
        this.messageManager = new MessageManager(this.bot, this.runtime);
        this.backend = runtime.getSetting("BACKEND_URL");
        this.backendToken = runtime.getSetting("BACKEND_TOKEN");
        this.tgTrader = runtime.getSetting("TG_TRADER"); // boolean To Be added to the settings
        okaiLogger.log("✅ TelegramClient constructor completed");
    }

    public async start(): Promise<void> {
        okaiLogger.log("🚀 Starting Telegram bot...");
        try {
            await this.initializeBot();
            this.setupMessageHandlers();
            this.setupShutdownHandlers();
        } catch (error) {
            okaiLogger.error("❌ Failed to launch Telegram bot:", error);
            throw error;
        }
    }

    private async initializeBot(): Promise<void> {
        this.bot.launch({ dropPendingUpdates: true });
        okaiLogger.log(
            "✨ Telegram bot successfully launched and is running!"
        );

        const botInfo = await this.bot.telegram.getMe();
        this.bot.botInfo = botInfo;
        okaiLogger.success(`Bot username: @${botInfo.username}`);

        this.messageManager.bot = this.bot;
    }

    private setupMessageHandlers(): void {
        okaiLogger.log("Setting up message handler...");

        this.bot.on("message", async (ctx) => {
            try {
                if (this.tgTrader) {
                    const userId = ctx.from?.id.toString();
                    const username =
                        ctx.from?.username || ctx.from?.first_name || "Unknown";
                    if (!userId) {
                        okaiLogger.warn(
                            "Received message from a user without an ID."
                        );
                        return;
                    }
                    try {
                        await getOrCreateRecommenderInBe(
                            userId,
                            username,
                            this.backendToken,
                            this.backend
                        );
                    } catch (error) {
                        okaiLogger.error(
                            "Error getting or creating recommender in backend",
                            error
                        );
                    }
                }
                await this.messageManager.handleMessage(ctx);
            } catch (error) {
                okaiLogger.error("❌ Error handling message:", error);
                await ctx.reply(
                    "An error occurred while processing your message."
                );
            }
        });

        this.bot.on("photo", (ctx) => {
            okaiLogger.log(
                "📸 Received photo message with caption:",
                ctx.message.caption
            );
        });

        this.bot.on("document", (ctx) => {
            okaiLogger.log(
                "📎 Received document message:",
                ctx.message.document.file_name
            );
        });

        this.bot.catch((err, ctx) => {
            okaiLogger.error(`❌ Telegram Error for ${ctx.updateType}:`, err);
            ctx.reply("An unexpected error occurred. Please try again later.");
        });
    }

    private setupShutdownHandlers(): void {
        const shutdownHandler = async (signal: string) => {
            okaiLogger.log(
                `⚠️ Received ${signal}. Shutting down Telegram bot gracefully...`
            );
            try {
                await this.stop();
                okaiLogger.log("🛑 Telegram bot stopped gracefully");
            } catch (error) {
                okaiLogger.error(
                    "❌ Error during Telegram bot shutdown:",
                    error
                );
                throw error;
            }
        };

        process.once("SIGINT", () => shutdownHandler("SIGINT"));
        process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
        process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
    }

    public async stop(): Promise<void> {
        okaiLogger.log("Stopping Telegram bot...");
        await this.bot.stop();
        okaiLogger.log("Telegram bot stopped");
    }
}
