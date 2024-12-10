import {
    composeContext,
    elizaLogger,
    generateObjectDEPRECATED,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@ai16z/eliza";
import { WalletProvider } from "../providers/wallet";
import { registerIPTemplate } from "../templates";
import { RegisterIPParams } from "../types";
import { RegisterIpResponse } from "@story-protocol/core-sdk";

export { registerIPTemplate };

export class RegisterIPAction {
    constructor(private walletProvider: WalletProvider) {}

    async registerIP(params: RegisterIPParams): Promise<RegisterIpResponse> {
        const storyClient = this.walletProvider.getStoryClient();

        const response = await storyClient.ipAsset.register({
            nftContract: params.contractAddress,
            tokenId: params.tokenId,
            txOptions: { waitForTransaction: true },
        });

        return response;
    }
}

export const registerIPAction = {
    name: "REGISTER_IP",
    description: "Register an NFT as an IP Asset on Story",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting REGISTER_IP handler...");

        // initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const registerIPContext = composeContext({
            state,
            template: registerIPTemplate,
        });

        const content = await generateObjectDEPRECATED({
            runtime,
            context: registerIPContext,
            modelClass: ModelClass.SMALL,
        });

        const walletProvider = new WalletProvider(runtime);
        const action = new RegisterIPAction(walletProvider);
        try {
            const response = await action.registerIP(content);
            callback?.({
                text: `Successfully registered IP ID: ${response.ipId}\nTransaction Hash: ${response.txHash}`,
            });
            return true;
        } catch (e) {
            elizaLogger.error("Error registering IP:", e.message);
            callback?.({ text: `Error registering IP: ${e.message}` });
            return false;
        }
    },
    template: registerIPTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("STORY_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "Ill help you register an NFT with contract address 0x041B4F29183317Fd352AE57e331154b73F8a1D73 and token id 209 as IP",
                    action: "REGISTER_IP",
                },
            },
            {
                user: "user",
                content: {
                    text: "Register an NFT with contract address 0x041B4F29183317Fd352AE57e331154b73F8a1D73 and token id 209 as IP",
                    action: "REGISTER_IP",
                },
            },
        ],
    ],
    similes: ["REGISTER_IP", "REGISTER_NFT"],
};
