// TODO: Implement this for Starknet.
// It should just transfer tokens from the agent's wallet to the recipient.

import {
    settings,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    composeContext,
    generateObject,
} from "@ai16z/eliza";
import { getStarknetAccount, validateSettings } from "../utils";
import { Account, RpcProvider } from "starknet";
import { PROVIDER_CONFIG } from "..";
import path from "path";
import fs from "fs";
import { ERC20Token } from "../utils/ERC20Token";

export interface TransferContent extends Content {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

function isTransferContent(
    runtime: IAgentRuntime,
    content: TransferContent
): content is TransferContent {
    console.log("Content for transfer", content);
    const validTypes = (
        typeof content.tokenAddress === "string" &&
        typeof content.recipient === "string" &&
        (typeof content.amount === "string" ||
            typeof content.amount === "number")
    );
    if (!validTypes) {
        return false;
    }

    // Addresses must be 32-bytes long with a 0x prefix
    const validAddresses = (
        content.tokenAddress.startsWith("0x") &&
        content.tokenAddress.length === 66 &&
        content.recipient.startsWith("0x") &&
        content.recipient.length === 66
    );
    return validTypes && validAddresses;
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "recipient": "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    "amount": "0.001"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN_ON_STARKNET",
        "TRANSFER_TOKENS_ON_STARKNET",
        "SEND_TOKENS_ON_STARKNET",
        "SEND_ETH_ON_STARKNET",
        "PAY_ON_STARKNET",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return validateSettings(runtime);
    },
    description: "Transfer tokens from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        console.log("Starting TRANSFER_TOKEN handler...");

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

        // Validate transfer content
        if (!isTransferContent(runtime, content)) {
            console.error("Invalid content for TRANSFER_TOKEN action.");
            if (callback) {
                callback({
                    text: "Unable to process transfer request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        try {
            const account = getStarknetAccount(runtime);
            const erc20Token = new ERC20Token(content.tokenAddress, account);
            const decimals = await erc20Token.decimals();
            const amountWei = BigInt(content.amount) * 10n ** BigInt(decimals);
            const transferCall = erc20Token.transferCall(content.recipient, amountWei);

            console.log("Transferring", amountWei, "of", content.tokenAddress, "to", content.recipient);

            const tx = await account.execute(transferCall);

            console.log("Transfer completed successfully! tx: " + tx.transaction_hash);
            if (callback) {
                callback({
                    text: "Transfer completed successfully! tx: " + tx.transaction_hash,
                    content: {},
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 69 STRK to 0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Transfer to 0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF 0.01 ETH",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
