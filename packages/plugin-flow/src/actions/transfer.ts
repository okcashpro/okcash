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
import Exception from "../types/exception";
import { getFlowConnectorInstance } from "../providers/connector.provider";
import {
    FlowWalletProvider,
    isCadenceIdentifier,
    isEVMAddress,
    isFlowAddress,
} from "../providers/wallet.provider";
import { transferTemplate } from "../templates";
import { validateFlowConfig } from "../environment";
import { TransactionResponse } from "../types";
import { transactions } from "../assets/transaction.defs";
import { scripts } from "../assets/script.defs";

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
        (!content.token ||
            (typeof content.token === "string" &&
                (isCadenceIdentifier(content.token) ||
                    isEVMAddress(content.token)))) &&
        typeof content.to === "string" &&
        (isEVMAddress(content.to) || isFlowAddress(content.to)) &&
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
        const authz = this.walletProvider.buildAuthorization(this.useKeyIndex); // use default private key

        // For different token types, we need to handle the token differently
        if (!content.token) {
            elizaLogger.log(
                `${logPrefix} Sending ${content.amount} FLOW to ${content.to}...`
            );
            // Transfer FLOW token
            resp.txid = await this.walletProvider.sendTransaction(
                transactions.mainFlowTokenDynamicTransfer,
                (arg, t) => [
                    arg(content.to, t.String),
                    arg(content.amount, t.UFix64),
                ],
                authz
            );
        } else if (isCadenceIdentifier(content.token)) {
            // Transfer Fungible Token on Cadence side
            const [_, tokenAddr, tokenContractName] = content.token.split(".");
            elizaLogger.log(
                `${logPrefix} Sending ${content.amount} A.${tokenAddr}${tokenContractName} to ${content.to}...`
            );

            resp.txid = await this.walletProvider.sendTransaction(
                transactions.mainFTGenericTransfer,
                (arg, t) => [
                    arg(content.amount, t.UFix64),
                    arg(content.to, t.Address),
                    arg(tokenAddr, t.Address),
                    arg(tokenContractName, t.String),
                ],
                authz
            );
        } else if (isEVMAddress(content.token)) {
            // Transfer ERC20 token on EVM side
            // we need to update the amount to be in the smallest unit
            const decimals = await this.walletProvider.executeScript(
                scripts.evmERC20GetDecimals,
                (arg, t) => [arg(content.token, t.String)],
                "18"
            );
            const adjustedAmount = BigInt(
                Number(content.amount) * Math.pow(10, parseInt(decimals))
            );

            elizaLogger.log(
                `${logPrefix} Sending ${adjustedAmount} ${content.token}(EVM) to ${content.to}...`
            );

            resp.txid = await this.walletProvider.sendTransaction(
                transactions.mainEVMTransferERC20,
                (arg, t) => [
                    arg(content.token, t.String),
                    arg(content.to, t.String),
                    // Convert the amount to string, the string should be pure number, not a scientific notation
                    arg(adjustedAmount.toString(), t.UInt256),
                ],
                authz
            );
        }

        elizaLogger.log(`${logPrefix} Sent transaction: ${resp.txid}`);

        // call the callback with the transaction response
        if (callback) {
            const tokenName = content.token || "FLOW";
            callback({
                text: `${logPrefix} Successfully transferred ${content.amount} ${tokenName} to ${content.to}\nTransaction: ${resp.txid}`,
                content: {
                    success: true,
                    txid: resp.txid,
                    token: content.token,
                    to: content.to,
                    amount: content.amount,
                },
            });
        }
        elizaLogger.log("Completed Flow Plugin's SEND_TOKEN handler.");

        return resp;
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
                    text: "Send 1 FLOW(A.1654653399040a61.FlowToken) to 0xa2de93114bae3e73",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sending 1 FLOW(A.1654653399040a61.FlowToken) tokens now, pls wait...",
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
