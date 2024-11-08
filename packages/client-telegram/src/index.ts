import elizaLogger from "@ai16z/eliza/src/logger.ts";
import { Client, IAgentRuntime } from "@ai16z/eliza/src/types.ts";
import { TelegramClient } from "./telegramClient.ts";

export const TelegramClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const botToken = runtime.getSetting("TELEGRAM_BOT_TOKEN");
        const tg = new TelegramClient(runtime, botToken);
        elizaLogger.success(
            `✅ Telegram client successfully started for character ${runtime.character.name}`
        );
        return tg;
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Telegram client does not support stopping yet");
    },
};

export default TelegramClientInterface;
