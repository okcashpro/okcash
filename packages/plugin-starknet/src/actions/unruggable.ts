import {
    ActionExample,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@ai16z/eliza";
import { composeContext } from "@ai16z/eliza";
import { generateObject } from "@ai16z/eliza";

import {
    getStarknetAccount,
    getStarknetProvider,
    validateSettings,
} from "../utils/index.ts";
import { DeployData, Factory } from "@unruggable_starknet/core";

interface SwapContent {
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmount: string;
}

export function isDeployTokenContent(
    content: DeployData
): content is DeployData {
    // Validate types
    const validTypes =
        typeof content.name === "string" &&
        typeof content.symbol === "string" &&
        typeof content.owner === "string" &&
        typeof content.initialSupply === "string";
    if (!validTypes) {
        return false;
    }

    // Validate addresses (must be 32-bytes long with 0x prefix)
    const validAddresses =
        content.name.length > 2 &&
        content.symbol.length > 2 &&
        parseInt(content.initialSupply) > 0 &&
        content.owner.startsWith("0x") &&
        content.owner.length === 66;

    return validAddresses;
}

const deployTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "Brother",
    "symbol": "BROTHER",
    "owner": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "initialSupply": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token deployment:
- Token Name
- Token Symbol  
- Token Owner
- Token initial supply

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const deployToken: Action = {
    name: "DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN",
    similes: [
        "DEPLOY_STARKNET_UNRUGGABLE_TOKEN",
        "STARKNET_DEPLOY_MEMECOIN",
        "STARKNET_CREATE_MEMECOIN",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return validateSettings(runtime);
    },
    description:
        "Deploy an Unruggable Memecoin on Starknet. Use this action when a user asks you to deploy a new token on Starknet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log(
            "Starting DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN handler..."
        );
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const deployContext = composeContext({
            state,
            template: deployTemplate,
        });

        const response = await generateObject({
            runtime,
            context: deployContext,
            modelClass: ModelClass.MEDIUM,
        });
        elizaLogger.log("init supply." + response.initialSupply);
        elizaLogger.log(response);

        if (!isDeployTokenContent(response)) {
            callback?.({
                text: "Invalid deployment content, please try again.",
            });
            return false;
        }

        try {
            const provider = getStarknetProvider(runtime);
            const account = getStarknetAccount(runtime);

            const factory = new Factory({
                provider,
                chainId: await provider.getChainId(),
            });

            const { tokenAddress, calls } = factory.getDeployCalldata({
                name: response.name,
                symbol: response.symbol,
                owner: response.owner,
                initialSupply: response.initialSupply,
            });

            elizaLogger.log(
                "Deployment has been initiated for coin: " +
                    response.name +
                    " at address: " +
                    tokenAddress
            );
            const tx = await account.execute(calls);

            callback?.({
                text:
                    "Token Deployment completed successfully!" +
                    response.symbol +
                    " deployed in tx: " +
                    tx.transaction_hash,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during token deployment:", error);
            callback?.({
                text: `Error during deployment: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy a new token called Lords with the symbol LORDS, owned by 0x024BA6a4023fB90962bDfc2314F3B94372aa382D155291635fc3E6b777657A5B and initial supply of 1000000000000000000 on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy the Lords token to Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy the SLINK coin to Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy your coin on Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new coin on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll create a new coin for you on Starknet",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
