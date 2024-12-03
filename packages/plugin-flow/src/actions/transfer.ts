import type {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@ai16z/eliza";
import { getFlowConnectorInstance } from "../providers/connector.provider";
import { FlowWalletProvider } from "../providers/wallet.provider";
import { transferTemplate } from "../templates";

export { transferTemplate };

export class TransferAction {
    constructor(private walletProvider: FlowWalletProvider) {}

    async transfer(
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<Transaction> {
        try {
            // TODO
        } catch (error) {
            throw new Error(`Transfer failed: ${error.message}`);
        }
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
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating transfer from user:", message.userId);
        const privateKey = runtime.getSetting("FLOW_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
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
        const _result = await action.transfer(runtime, message, state);
        return false;
    },
    template: transferTemplate,
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
