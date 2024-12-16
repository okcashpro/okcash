import { IAgentRuntime } from "@ai16z/eliza";

export async function validateWhatsAppConfig(
    runtime: IAgentRuntime
): Promise<void> {
    const requiredSettings = [
        "WHATSAPP_API_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_APP_ID",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
    ];

    for (const setting of requiredSettings) {
        if (!runtime.getSetting(setting)) {
            throw new Error(
                `Missing required WhatsApp configuration: ${setting}`
            );
        }
    }
} 