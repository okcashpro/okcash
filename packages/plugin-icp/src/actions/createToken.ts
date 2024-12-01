import { composeContext } from "@ai16z/eliza/src/context";
import { generateObject } from "@ai16z/eliza/src/generation";
import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@ai16z/eliza/src/types";
import { idlFactory } from "../canisters/pick-pump/index.did";
import { _SERVICE } from "../canisters/pick-pump/index.did.d";
import { ActorCreator, CreateMemeTokenArg } from "../types";
import { unwrapOption, wrapOption } from "../utils/common/types/options";
import { unwrapRustResultMap } from "../utils/common/types/results";
import { icpWalletProvider } from "../providers/wallet";

const createTokenTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Based on the user's description, generate appropriate values for a new token:
- Create a suitable token name
- Generate a 3-4 letter symbol based on the name
- Write a clear description
- Use "https://icptoken.default.logo" as default logo URL
- Set other fields to null

Example response:
\`\`\`json
{
    "name": "My ICP Token",
    "symbol": "MIT",
    "description": "A fun meme token on ICP",
    "logo": "https://icptoken.default.logo",
    "website": null,
    "twitter": null,
    "telegram": null
}
\`\`\`

{{recentMessages}}

Generate appropriate token information based on the user's description.
Respond with a JSON markdown block containing only the generated values.`;

async function createTokenTransaction(
    creator: ActorCreator,
    tokenInfo: CreateMemeTokenArg
): Promise<any> {
    const actor: _SERVICE = await creator(
        idlFactory,
        "bn4fo-iyaaa-aaaap-akp6a-cai"
    );

    const result = await actor.create_token({
        ...tokenInfo,
        name: tokenInfo.name ?? "My ICP Token",
        symbol: tokenInfo.symbol ?? "MIT",
        description: tokenInfo.description ?? "A fun meme token on ICP",
        logo: "https://icptoken.default.logo",
        twitter: wrapOption(tokenInfo.twitter),
        website: wrapOption(tokenInfo.website),
        telegram: wrapOption(tokenInfo.telegram),
    });

    return unwrapRustResultMap(
        result,
        (ok) => ({
            ...ok,
            twitter: unwrapOption(ok.twitter),
            website: unwrapOption(ok.website),
            telegram: unwrapOption(ok.telegram),
        }),
        (err) => {
            throw new Error(`Token creation failed: ${err}`);
        }
    );
}

export const executeCreateToken: Action = {
    name: "CREATE_TOKEN",
    similes: ["CREATE_COIN", "MINT_TOKEN", "DEPLOY_TOKEN", "CREATE_ICP_TOKEN"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Message:", message);
        return true;
    },
    description: "Create a new token on Internet Computer.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const createTokenContext = composeContext({
            state,
            template: createTokenTemplate,
        });

        const response = await generateObject({
            runtime,
            context: createTokenContext,
            modelClass: ModelClass.LARGE,
        });

        console.log("Response:", response);

        // Validate required fields
        if (
            !response.name ||
            !response.symbol ||
            !response.description ||
            !response.logo
        ) {
            const responseMsg = {
                text: "I need the token name, symbol, description, and logo URL to create a token",
            };
            callback?.(responseMsg);
            return true;
        }

        try {
            const { wallet } = await icpWalletProvider.get(
                runtime,
                message,
                state
            );
            const creator = wallet.createActor;
            const createTokenResult = await createTokenTransaction(creator, {
                name: response.name,
                symbol: response.symbol,
                description: response.description,
                website: response.website,
                twitter: response.twitter,
                telegram: response.telegram,
            });

            console.log("Token created successfully:", createTokenResult);
            const responseMsg = {
                text: `Token ${response.name} (${response.symbol}) created successfully on ICP!`,
                data: createTokenResult,
            };

            callback?.(responseMsg);
            return true;
        } catch (error) {
            console.error("Error creating token:", error);
            const responseMsg = {
                text: `Failed to create token: ${error.message}`,
            };
            callback?.(responseMsg);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: "I want to create a token for dog lovers",
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Creating new ICP token WOOF...",
                    action: "CREATE_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Token created successfully on Internet Computer!",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
