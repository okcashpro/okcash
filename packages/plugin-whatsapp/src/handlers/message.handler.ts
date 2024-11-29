import { WhatsAppClient } from "../client";
import { WhatsAppMessage } from "../types";

export class MessageHandler {
    constructor(private client: WhatsAppClient) {}

    async send(message: WhatsAppMessage): Promise<any> {
        try {
            const response = await this.client.sendMessage(message);
            return response.data;
        } catch (error) {
            throw new Error(
                `Failed to send WhatsApp message: ${error.message}`
            );
        }
    }
}
