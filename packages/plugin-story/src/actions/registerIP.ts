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
import { storyWalletProvider, WalletProvider } from "../providers/wallet";
import { registerIPTemplate } from "../templates";
import { RegisterIPParams } from "../types";
import { RegisterIpResponse } from "@story-protocol/core-sdk";
import { PinataProvider } from "../providers/pinata";
import { createHash } from "crypto";

export { registerIPTemplate };

export class RegisterIPAction {
    constructor(
        private walletProvider: WalletProvider,
        private pinataProvider: PinataProvider
    ) {}

    async registerIP(params: RegisterIPParams): Promise<RegisterIpResponse> {
        const storyClient = this.walletProvider.getStoryClient();

        // configure ip metadata
        const ipMetadata = storyClient.ipAsset.generateIpMetadata({
            title: params.title,
            description: params.description,
            ipType: params.ipType ? params.ipType : undefined,
        });

        // configure nft metadata
        const nftMetadata = {
            name: params.title,
            description: params.description,
        };

        // upload metadata to ipfs
        const ipIpfsHash =
            await this.pinataProvider.uploadJSONToIPFS(ipMetadata);
        const ipHash = createHash("sha256")
            .update(JSON.stringify(ipMetadata))
            .digest("hex");
        const nftIpfsHash =
            await this.pinataProvider.uploadJSONToIPFS(nftMetadata);
        const nftHash = createHash("sha256")
            .update(JSON.stringify(nftMetadata))
            .digest("hex");

        // register ip
        const response =
            await storyClient.ipAsset.mintAndRegisterIpAssetWithPilTerms({
                spgNftContract: "0xC81B2cbEFD1aA0227bf513729580d3CF40fd61dF",
                terms: [],
                ipMetadata: {
                    ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                    ipMetadataHash: `0x${ipHash}`,
                    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
                    nftMetadataHash: `0x${nftHash}`,
                },
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

        const walletInfo = await storyWalletProvider.get(
            runtime,
            message,
            state
        );
        state.walletInfo = walletInfo;

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
        const pinataProvider = new PinataProvider(runtime);
        const action = new RegisterIPAction(walletProvider, pinataProvider);
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
                user: "user",
                content: {
                    text: "Register my IP titled 'My IP' with the description 'This is my IP'",
                    action: "REGISTER_IP",
                },
            },
        ],
    ],
    similes: ["REGISTER_IP", "REGISTER_NFT"],
};
