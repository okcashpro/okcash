import { TelegramClient } from "./src/index.ts";
import { IAgentRuntime } from "@ai16z/eliza/src/types.ts";
import { Client } from "@ai16z/eliza/src/types.ts";
import settings from "@ai16z/eliza/src/settings.ts";
import elizaLogger from "@ai16z/eliza/src/logger.ts";

const TelegramClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const tg = new TelegramClient(runtime, settings.TELEGRAM_BOT_TOKEN);
        elizaLogger.success(
            `✅ Telegram client successfully started for character ${runtime.character.name}`
        );
        return tg;
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Telegram client does not support stopping yet");
    }
}

export default TelegramClientInterface;