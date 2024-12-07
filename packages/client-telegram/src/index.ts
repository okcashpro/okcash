import { okaiLogger } from "@okcashpro/okai";
import { Client, IAgentRuntime } from "@okcashpro/okai";
import { TelegramClient } from "./telegramClient.ts";
import { validateTelegramConfig } from "./environment.ts";

export const TelegramClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        await validateTelegramConfig(runtime);

        const tg = new TelegramClient(
            runtime,
            runtime.getSetting("TELEGRAM_BOT_TOKEN")
        );

        await tg.start();

        okaiLogger.success(
            `✅ Telegram client successfully started for character ${runtime.character.name}`
        );
        return tg;
    },
    stop: async (_runtime: IAgentRuntime) => {
        okaiLogger.warn("Telegram client does not support stopping yet");
    },
};

export default TelegramClientInterface;
