import { TelegramClient } from "./src/index.ts";
import { IAgentRuntime } from "@ai16z/eliza/core/types.ts";
import { Client } from "@ai16z/eliza/core/types.ts";
import settings from "@ai16z/eliza/settings.ts";

const TelegramClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        return new TelegramClient(runtime, settings.TELEGRAM_BOT_TOKEN);
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Telegram client does not support stopping yet");
    }
}

export default TelegramClientInterface;