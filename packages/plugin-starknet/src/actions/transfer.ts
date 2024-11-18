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
import {
    getStarknetAccount,
    isTransferContent,
    validateSettings,
} from "../utils";
import { ERC20Token } from "../utils/ERC20Token";

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

For the amount to send, use a value from 1 - 100. Determine this based on your judgement of the recipient.

these are known addresses, if you get asked about them, use these:
- BTC/btc: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
- ETH/eth: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
- STRK/strk: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- LORDS/lords: 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49

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
    description:
        "MUST use this action if the user requests send a token or transfer a token, the request might be varied, but it will always be a token transfer. If the user requests a transfer of lords, use this action.",
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
            modelClass: ModelClass.MEDIUM,
        });

        console.log("Transfer content:", content);

        // Validate transfer content
        if (!isTransferContent(content)) {
            console.error("Invalid content for TRANSFER_TOKEN action.");
            if (callback) {
                callback({
                    text: "Not enough information to transfer tokens. Please respond with token address, recipient, and amount.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        try {
            const account = getStarknetAccount(runtime);
            const erc20Token = new ERC20Token(content.tokenAddress, account);
            const decimals = await erc20Token.decimals();
            // Convert decimal amount to integer before converting to BigInt
            const amountInteger = Math.floor(
                Number(content.amount) * Math.pow(10, Number(decimals))
            );
            const amountWei = BigInt(amountInteger.toString());
            const transferCall = erc20Token.transferCall(
                content.recipient,
                amountWei
            );

            console.log(
                "Transferring",
                amountWei,
                "of",
                content.tokenAddress,
                "to",
                content.recipient
            );

            const tx = await account.execute(transferCall);

            console.log(
                "Transfer completed successfully! tx: " + tx.transaction_hash
            );
            if (callback) {
                callback({
                    text:
                        "Transfer completed successfully! tx: " +
                        tx.transaction_hash,
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
            {
                user: "{{user3}}",
                content: {
                    text: "Please send 100 STRK tokens to 0x789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF012345",
                },
            },
            {
                user: "{{user4}}",
                content: {
                    text: "I'd like to transfer 0.5 ETH to 0xABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234567",
                },
            },
            {
                user: "{{user5}}",
                content: {
                    text: "Can you send 25 STRK to wallet 0x456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF012",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Transfer 1.5 ETH -> 0x123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Send 42.42 STRK tokens to address 0xDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789",
                },
            },
            {
                user: "{{user3}}",
                content: {
                    text: "Could you transfer 0.1 ETH to this address: 0xEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABC",
                },
            },
            {
                user: "{{user4}}",
                content: {
                    text: "I am requesting 777 STRK to be sent to this address: 0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                },
            },
            {
                user: "{{user5}}",
                content: {
                    text: "I really think i need 100 lords to be sent to this address: 0xBCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789A",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "I am requesting 100 lords to be sent to this address: 0xCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789AB",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Transfer lords to 0x90ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234567",
                },
            },
            {
                user: "{{user3}}",
                content: {
                    text: "The repair of the squire blobert kingdom kitchen has been completed. Could you please send 100 LORDS tokens to 0x0277eE04e3f82D4E805Ab0e2044C53fB6d61ABd00a2a7f44B78410e9b43E1344",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
