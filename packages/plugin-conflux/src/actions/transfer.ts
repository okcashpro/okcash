import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
} from "@ai16z/eliza";
import { z } from "zod";
import { generateObjectV2, composeContext, ModelClass, Content } from "@ai16z/eliza";
import { createPublicClient, createWalletClient, http, parseCFX } from "cive";
import { privateKeyToAccount } from "cive/accounts";
import { testnet } from "cive/chains";
import { confluxTransferTemplate } from "../templates/transfer";

const TransferSchema = z.object({
    to: z.string(),
    amount: z.number(), // use number ignoring decimals issue
});

interface TransferContent extends Content {
    to: string;
    amount: number;
}

const isTransferContent = (object: any): object is TransferContent => {
    if (TransferSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};

const sendCFX = async (
    secretKey: `0x${string}`,
    rpcUrl: string,
    to: string,
    amount: string
) => {
    const client = createPublicClient({
        transport: http(rpcUrl),
    });
    const networkId = await client.getChainId();
    const account = privateKeyToAccount(secretKey, { networkId });

    const walletClient = createWalletClient({
        transport: http(rpcUrl),
        chain: testnet,
    });

    const hash = await walletClient.sendTransaction({
        account,
        to,
        value: parseCFX(amount),
        chain: testnet,
    });

    await client.waitForTransactionReceipt({
        hash,
    });
    return hash;
};

export const transfer: Action = {
    name: "SEND_CFX",
    description:
        "Transfer CFX from to another in Conflux Core Space",
    similes: ["SEND_CONFLUX", "SEND_CFX_CORE_SPACE", "TRANSFER_CFX"],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 CFX to 0x1234567890abcdef",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "1 CFX sent to 0x1234567890abcdef: 0x1234567890abcdef",
                    content: {
                        to: "0x1234567890abcdef",
                        amount: "1",
                    },
                },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // no extra validation needed
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: confluxTransferTemplate,
        });

        const content = await generateObjectV2({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: TransferSchema,
        });

        if (!isTransferContent(content.object)) {
            throw new Error("Invalid content");
        }

        const secretKey = runtime.getSetting("CONFLUX_CORE_PRIVATE_KEY") as `0x${string}`;
        const rpcUrl = runtime.getSetting("CONFLUX_CORE_SPACE_RPC_URL");

        let success = false;

        try {
            const hash = await sendCFX(secretKey, rpcUrl, content.object.to, content.object.amount.toString());
            success = true;
            if (!callback) {
                return success;
            }
            callback({
                text: `${content.object.amount} CFX sent to ${content.object.to}: ${hash}`,
                content: content.object,
            });
        } catch (error) {
            console.error(`Error sending CFX: ${error}`);
            if (!callback) {
                return success;
            }
            callback({
                text: `Failed to send ${content.object.amount} CFX to ${content.object.to}: ${error}`,
            });
        }
        return success;
    },
};
