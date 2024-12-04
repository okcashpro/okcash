import {
    composeContext,
    Content,
    elizaLogger,
    generateObject,
    ModelClass,
    type Action,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@ai16z/eliza";
import { getFlowConnectorInstance } from "../providers/connector.provider";
import { FlowWalletProvider } from "../providers/wallet.provider";
import { transferTemplate } from "../templates";
import { validateFlowConfig } from "../environment";
import { TransactionResponse } from "../types";
import Exception from "../types/exception";

export { transferTemplate };

/**
 * The generated content for the transfer action
 */
export interface TransferContent extends Content {
    token: string | null;
    amount: string;
    to: string;
    matched: boolean;
}

/**
 * Check if the content is a transfer content
 */
function isTransferContent(
    runtime: IAgentRuntime,
    content: any
): content is TransferContent {
    elizaLogger.log("Content for transfer", content);
    return (
        (typeof content.token === "string" || !content.token) &&
        typeof content.to === "string" &&
        (typeof content.amount === "string" ||
            typeof content.amount === "number") &&
        typeof content.matched === "boolean"
    );
}

export class TransferAction {
    public useKeyIndex: number;

    constructor(private walletProvider: FlowWalletProvider) {
        // Initialize key index
        this.useKeyIndex = 0;
    }

    async transfer(
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<TransactionResponse> {
        elizaLogger.log("Starting Flow Plugin's SEND_TOKEN handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
        });

        const resp: TransactionResponse = {
            signer: {
                address: this.walletProvider.address,
                keyIndex: this.useKeyIndex,
            },
            txid: "",
        };
        const logPrefix = `<Address: ${resp.signer.address}>[${resp.signer.keyIndex}]`;

        // Validate transfer content
        if (!isTransferContent(runtime, content)) {
            elizaLogger.error("Invalid content for SEND_TOKEN action.");
            if (callback) {
                callback({
                    text: `${logPrefix} Unable to process transfer request. Invalid content provided.`,
                    content: { error: "Invalid transfer content" },
                });
            }
            throw new Exception(50100, "Invalid transfer content");
        }

        // Check if the content is matched
        if (!content.matched) {
            elizaLogger.error("Content does not match the transfer template.");
            if (callback) {
                callback({
                    text: `${logPrefix} Unable to process transfer request. Content does not match the transfer template.`,
                    content: {
                        error: "Content does not match the transfer template",
                    },
                });
            }
            throw new Exception(
                50100,
                "Content does not match the transfer template"
            );
        }

        // Execute transfer
        // TODO: Implement the transfer logic here

        // call the callback with the transaction response
        if (callback) {
            const tokenName = content.token || "FLOW";
            callback({
                text: `${logPrefix} Successfully transferred ${content.amount} ${tokenName} to ${content.to}\nTransaction: ${resp.txid}`,
                content: {
                    success: true,
                    token: content.token,
                    to: content.to,
                    amount: content.amount,
                },
            });
        }
        elizaLogger.log("Completed Flow Plugin's SEND_TOKEN handler.");
    }
}

export const transferAction = {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER",
        "TRANSFER_TOKEN",
        "TRANSFER_TOKENS",
        "SEND_TOKENS",
        "SEND_FLOW",
        "PAY",
    ],
    description: "Transfer tokens from the agent's wallet to another address",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateFlowConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const flowConnector = await getFlowConnectorInstance(runtime);
        const walletProvider = new FlowWalletProvider(runtime, flowConnector);
        const action = new TransferAction(walletProvider);
        try {
            const res = await action.transfer(
                runtime,
                message,
                state,
                callback
            );
            elizaLogger.log(
                `Transfer action response: Sender<${res.signer.address}[${res.signer.keyIndex}> - ${res.txid}`
            );
        } catch (error) {
            elizaLogger.error("Error in transfer action:", error.message);
            return false;
        }
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 FLOW to 0xa2de93114bae3e73",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1 FLOW tokens now, pls wait...",
                    action: "SEND_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 1 FLOW to 0xa2de93114bae3e73\nTransaction ID: de5f9f45f6ccefb4b5affa05fc6ea28d86249014748c2c9efca3fcf8c03183f1",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 FLOW(A.1654653399040a61.FlowToken.Vault) to 0xa2de93114bae3e73",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1 FLOW(A.1654653399040a61.FlowToken.Vault) tokens now, pls wait...",
                    action: "SEND_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 1 FLOW to 0xa2de93114bae3e73\nTransaction ID: de5f9f45f6ccefb4b5affa05fc6ea28d86249014748c2c9efca3fcf8c03183f1",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1000 FROTH(0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba) to 0x000000000000000000000002e44fbfbd00395de5",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1000 FROTH(0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba) tokens now, pls wait...",
                    action: "SEND_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 1000 FROTH to 0x000000000000000000000002e44fbfbd00395de5\nTransaction ID: de5f9f45f6ccefb4b5affa05fc6ea28d86249014748c2c9efca3fcf8c03183f1",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
