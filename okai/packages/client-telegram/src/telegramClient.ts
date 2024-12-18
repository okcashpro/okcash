import { Context, Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
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

    private async isGroupAuthorized(ctx: Context): Promise<boolean> {
        const config = this.runtime.character.clientConfig?.telegram;
        if (ctx.from?.id === ctx.botInfo?.id) {
            return false;
        }

        if (!config?.shouldOnlyJoinInAllowedGroups) {
            return true;
        }

        const allowedGroups = config.allowedGroupIds || [];
        const currentGroupId = ctx.chat.id.toString();

        if (!allowedGroups.includes(currentGroupId)) {
            okaiLogger.info(`Unauthorized group detected: ${currentGroupId}`);
            try {
                await ctx.reply("Not authorized. Leaving.");
                await ctx.leaveChat();
            } catch (error) {
                okaiLogger.error(`Error leaving unauthorized group ${currentGroupId}:`, error);
            }
            return false;
        }

        return true;
    }

    private setupMessageHandlers(): void {
        okaiLogger.log("Setting up message handler...");

        this.bot.on(message('new_chat_members'), async (ctx) => {
            try {
                const newMembers = ctx.message.new_chat_members;
                const isBotAdded = newMembers.some(member => member.id === ctx.botInfo.id);

                if (isBotAdded && !(await this.isGroupAuthorized(ctx))) {
                    return;
                }
            } catch (error) {
                okaiLogger.error("Error handling new chat members:", error);
            }
        });

        this.bot.on("message", async (ctx) => {
            try {
                // Check group authorization first
                if (!(await this.isGroupAuthorized(ctx))) {
                    return;
                }

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
                // Don't try to reply if we've left the group or been kicked
                if (error?.response?.error_code !== 403) {
                    try {
                        await ctx.reply("An error occurred while processing your message.");
                    } catch (replyError) {
                        okaiLogger.error("Failed to send error message:", replyError);
                    }
                }
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
