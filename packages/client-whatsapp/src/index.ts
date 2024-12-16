import { elizaLogger } from "@ai16z/eliza";
import { Client, IAgentRuntime } from "@ai16z/eliza";
import { WhatsAppClient } from "./whatsappClient";
import { validateWhatsAppConfig } from "../../../eliza/packages/client-whatsapp/src/environment";

export const WhatsAppClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        await validateWhatsAppConfig(runtime);

        const client = new WhatsAppClient(
            runtime,
            runtime.getSetting("WHATSAPP_API_TOKEN"),
            runtime.getSetting("WHATSAPP_PHONE_NUMBER_ID")
        );

        await client.start();

        elizaLogger.success(
            `✅ WhatsApp client successfully started for character ${runtime.character.name}`
        );
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        elizaLogger.warn("WhatsApp client stopping...");
    },
};

export default WhatsAppClientInterface; 