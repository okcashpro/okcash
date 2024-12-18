import { Coinbase, Webhook } from "@coinbase/coinbase-sdk";
import {
    Action,
    Plugin,
    okaiLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    Provider,
} from "@okcashpro/okai";
import { WebhookSchema, isWebhookContent, WebhookContent } from "../types";
import { webhookTemplate } from "../templates";
import { appendWebhooksToCsv } from "../utils";

export const webhookProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        try {
            Coinbase.configure({
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
            });

            // List all webhooks
            const resp = await Webhook.list();
            okaiLogger.log("Listing all webhooks:", resp.data);

            return {
                webhooks: resp.data.map((webhook: Webhook) => ({
                    id: webhook.getId(),
                    networkId: webhook.getNetworkId(),
                    eventType: webhook.getEventType(),
                    eventFilters: webhook.getEventFilters(),
                    eventTypeFilter: webhook.getEventTypeFilter(),
                    notificationURI: webhook.getNotificationURI(),
                })),
            };
        } catch (error) {
            okaiLogger.error("Error in webhookProvider:", error);
            return [];
        }
    },
};

export const createWebhookAction: Action = {
    name: "CREATE_WEBHOOK",
    description: "Create a new webhook using the Coinbase SDK.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        okaiLogger.log("Validating runtime for CREATE_WEBHOOK...");
        return (
            !!(
                runtime.character.settings.secrets?.COINBASE_API_KEY ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
                process.env.COINBASE_PRIVATE_KEY
            ) &&
            !!(
                runtime.character.settings.secrets?.COINBASE_NOTIFICATION_URI ||
                process.env.COINBASE_NOTIFICATION_URI
            )
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        okaiLogger.log("Starting CREATE_WEBHOOK handler...");

        try {
            Coinbase.configure({
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
            });

            const context = composeContext({
                state,
                template: webhookTemplate,
            });

            const webhookDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: WebhookSchema,
            });

            if (!isWebhookContent(webhookDetails.object)) {
                callback(
                    {
                        text: "Invalid webhook details. Ensure network, URL, event type, and contract address are correctly specified.",
                    },
                    []
                );
                return;
            }

            const { networkId, eventType, eventFilters, eventTypeFilter } =
                webhookDetails.object as WebhookContent;
            const notificationUri =
                runtime.getSetting("COINBASE_NOTIFICATION_URI") ??
                process.env.COINBASE_NOTIFICATION_URI;

            if (!notificationUri) {
                callback(
                    {
                        text: "Notification URI is not set in the environment variables.",
                    },
                    []
                );
                return;
            }
            okaiLogger.log("Creating webhook with details:", {
                networkId,
                notificationUri,
                eventType,
                eventTypeFilter,
                eventFilters,
            });
            const webhook = await Webhook.create({
                networkId,
                notificationUri,
                eventType,
                eventFilters,
            });
            okaiLogger.log(
                "Webhook created successfully:",
                webhook.toString()
            );
            callback(
                {
                    text: `Webhook created successfully: ${webhook.toString()}`,
                },
                []
            );
            await appendWebhooksToCsv([webhook]);
            okaiLogger.log("Webhook appended to CSV successfully");
        } catch (error) {
            okaiLogger.error("Error during webhook creation:", error);
            callback(
                {
                    text: "Failed to create the webhook. Please check the logs for more details.",
                },
                []
            );
        }
    },
    similes: ["WEBHOOK", "NOTIFICATION", "EVENT", "TRIGGER", "LISTENER"],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a webhook on base for address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 on the event type: transfers",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Webhook created successfully: Webhook ID: {{webhookId}}, Network ID: {{networkId}}, Notification URI: {{notificationUri}}, Event Type: {{eventType}}`,
                    action: "CREATE_WEBHOOK",
                },
            },
        ],
    ],
};

export const webhookPlugin: Plugin = {
    name: "webhookPlugin",
    description: "Manages webhooks using the Coinbase SDK.",
    actions: [createWebhookAction],
    providers: [webhookProvider],
};
