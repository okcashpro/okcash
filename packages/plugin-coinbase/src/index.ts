import { CBCommerceClient } from "coinbase-api";
import { elizaLogger } from "@ai16z/eliza";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@ai16z/eliza";

export type ChargeParams = {
    buyer_locale?: string;
    cancel_url?: string;
    checkout_id?: string;
    local_price: {
        amount: string;
        currency: string;
    };
    metadata?: {
        custom_field?: string;
        custom_field_two?: string;
    };
    pricing_type: string;
    redirect_url?: string;
};

export async function createCharge(
    client: CBCommerceClient,
    params: ChargeParams
) {
    try {
        const response = await client.createCharge({
            local_price: params.local_price,
            pricing_type: params.pricing_type,
            buyer_locale: params.buyer_locale,
            cancel_url: params.cancel_url,
            redirect_url: params.redirect_url,
            metadata: params.metadata,
        });

        console.log("Charge created successfully:", response);
    } catch (error) {
        console.error("Error creating charge:", error);
    }
}

// Function to fetch all charges
export async function getAllCharges(client: CBCommerceClient) {
    try {
        const response = await client.getAllCharges();
        console.log("Fetched all charges:", response);
    } catch (error) {
        console.error("Error fetching charges:", error);
    }
}

// Function to fetch details of a specific charge
export async function getChargeDetails(
    client: CBCommerceClient,
    chargeId: string
) {
    try {
        const response = await client.getCharge({
            charge_code_or_charge_id: chargeId,
        });
        console.log("Charge details:", response);
    } catch (error) {
        console.error("Error fetching charge details:", error);
    }
}

export const createCoinbaseChargeAction: Action = {
    name: "CREATE_CHARGE",
    similes: [
        "MAKE_CHARGE",
        "INITIATE_CHARGE",
        "GENERATE_CHARGE",
        "CREATE_TRANSACTION",
        "COINBASE_CHARGE",
    ],
    description: "Create a charge using Coinbase Commerce.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const coinbaseCommerceKeyOk = !!runtime.getSetting(
            "COINBASE_COMMERCE_KEY"
        );

        // Ensure Coinbase Commerce API key is available
        return coinbaseCommerceKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;

        const chargeDetails = message.content.data as ChargeParams; // Safely typecast or validate the incoming data
        if (
            !chargeDetails ||
            !chargeDetails.local_price ||
            !chargeDetails.pricing_type
        ) {
            callback(
                {
                    text: "Invalid charge details provided.",
                },
                []
            );
            return;
        }

        elizaLogger.log("Charge details received:", chargeDetails);

        // Initialize Coinbase Commerce client
        const commerceClient = new CBCommerceClient({
            apiKey: runtime.getSetting("COINBASE_COMMERCE_KEY"),
        });

        try {
            // Create a charge
            const chargeResponse = await commerceClient.createCharge({
                local_price: chargeDetails.local_price,
                pricing_type: chargeDetails.pricing_type,
                buyer_locale: chargeDetails.buyer_locale || "en-US",
                cancel_url: chargeDetails.cancel_url,
                redirect_url: chargeDetails.redirect_url,
                metadata: chargeDetails.metadata || {},
            });

            elizaLogger.log(
                "Coinbase Commerce charge created:",
                chargeResponse
            );

            callback(
                {
                    text: `Charge created successfully: ${chargeResponse.hosted_url}`,
                    attachments: [
                        {
                            id: crypto.randomUUID(),
                            url: chargeResponse.hosted_url,
                            title: "Coinbase Commerce Charge",
                            description: `Charge ID: ${chargeResponse.id}`,
                            text: `Pay here: ${chargeResponse.hosted_url}`,
                            source: "coinbase",
                        },
                    ],
                },
                []
            );
        } catch (error) {
            elizaLogger.error(
                "Error creating Coinbase Commerce charge:",
                error
            );
            callback(
                {
                    text: "Failed to create a charge. Please try again.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a charge for $10.00",
                    data: {
                        local_price: {
                            amount: "10.00",
                            currency: "USD",
                        },
                        pricing_type: "fixed_price",
                        buyer_locale: "en-US",
                        cancel_url: "https://example.com/cancel",
                        redirect_url: "https://example.com/success",
                    },
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Charge created successfully: https://commerce.coinbase.com/charges/123456",
                    action: "CREATE_CHARGE",
                },
            },
        ],
    ],
} as Action;

export const getAllChargesAction: Action = {
    name: "GET_ALL_CHARGES",
    similes: ["FETCH_ALL_CHARGES", "RETRIEVE_ALL_CHARGES", "LIST_ALL_CHARGES"],
    description: "Fetch all charges using Coinbase Commerce.",
    validate: async (runtime: IAgentRuntime) => {
        const coinbaseCommerceKeyOk = !!runtime.getSetting(
            "COINBASE_COMMERCE_KEY"
        );

        // Ensure Coinbase Commerce API key is available
        return coinbaseCommerceKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const commerceClient = new CBCommerceClient({
            apiKey: runtime.getSetting("COINBASE_COMMERCE_KEY"),
        });

        try {
            const charges = await commerceClient.getAllCharges();

            elizaLogger.log("Fetched all charges:", charges);

            callback(
                {
                    text: `Successfully fetched all charges. Total charges: ${charges.length}`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error fetching all charges:", error);
            callback(
                {
                    text: "Failed to fetch all charges. Please try again.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Fetch all charges" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully fetched all charges.",
                    action: "GET_ALL_CHARGES",
                },
            },
        ],
    ],
} as Action;

export const getChargeDetailsAction: Action = {
    name: "GET_CHARGE_DETAILS",
    similes: ["FETCH_CHARGE_DETAILS", "RETRIEVE_CHARGE_DETAILS", "GET_CHARGE"],
    description: "Fetch details of a specific charge using Coinbase Commerce.",
    validate: async (runtime: IAgentRuntime) => {
        const coinbaseCommerceKeyOk = !!runtime.getSetting(
            "COINBASE_COMMERCE_KEY"
        );

        // Ensure Coinbase Commerce API key is available
        return coinbaseCommerceKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const { chargeId } = options;

        if (!chargeId) {
            callback(
                {
                    text: "Missing charge ID. Please provide a valid charge ID.",
                },
                []
            );
            return;
        }

        const commerceClient = new CBCommerceClient({
            apiKey: runtime.getSetting("COINBASE_COMMERCE_KEY"),
        });

        try {
            const chargeDetails = await commerceClient.getCharge({
                charge_code_or_charge_id: chargeId,
            });

            elizaLogger.log("Fetched charge details:", chargeDetails);

            callback(
                {
                    text: `Successfully fetched charge details for ID: ${chargeId}`,
                    attachments: [
                        {
                            id: crypto.randomUUID(),
                            url: chargeDetails.hosted_url,
                            title: `Charge Details for ${chargeId}`,
                            description: `Details: ${JSON.stringify(chargeDetails, null, 2)}`,
                            source: "coinbase",
                            text: "",
                        },
                    ],
                },
                []
            );
        } catch (error) {
            elizaLogger.error(
                `Error fetching details for charge ID ${chargeId}:`,
                error
            );
            callback(
                {
                    text: `Failed to fetch details for charge ID: ${chargeId}. Please try again.`,
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Fetch details of charge ID: 123456",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully fetched charge details.",
                    action: "GET_CHARGE_DETAILS",
                },
            },
        ],
    ],
};

export const coinbaseCommercePlugin: Plugin = {
    name: "coinbaseCommerce",
    description:
        "Integration with Coinbase Commerce for creating and managing charges.",
    actions: [
        createCoinbaseChargeAction,
        getAllChargesAction,
        getChargeDetailsAction,
    ],
    evaluators: [],
    providers: [],
};
