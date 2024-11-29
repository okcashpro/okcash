import { Plugin } from "@eliza/core";
import { WhatsAppClient } from "./client";
import { WhatsAppConfig, WhatsAppMessage, WhatsAppWebhookEvent } from "./types";
import { MessageHandler, WebhookHandler } from "./handlers";

export class WhatsAppPlugin implements Plugin {
    private client: WhatsAppClient;
    private messageHandler: MessageHandler;
    private webhookHandler: WebhookHandler;

    constructor(private config: WhatsAppConfig) {
        this.client = new WhatsAppClient(config);
        this.messageHandler = new MessageHandler(this.client);
        this.webhookHandler = new WebhookHandler(this.client);
    }

    async sendMessage(message: WhatsAppMessage): Promise<any> {
        return this.messageHandler.send(message);
    }

    async handleWebhook(event: WhatsAppWebhookEvent): Promise<void> {
        return this.webhookHandler.handle(event);
    }

    async verifyWebhook(token: string): Promise<boolean> {
        return this.client.verifyWebhook(token);
    }
}

export * from "./types";
