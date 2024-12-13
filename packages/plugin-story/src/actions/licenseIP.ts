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
import { licenseIPTemplate } from "../templates";
import { LicenseIPParams } from "../types";
import { MintLicenseTokensResponse } from "@story-protocol/core-sdk";
import { hasIpAttachedLicenseTerms } from "../queries";

export { licenseIPTemplate };

export class LicenseIPAction {
    constructor(private walletProvider: WalletProvider) {}

    async licenseIP(
        params: LicenseIPParams
    ): Promise<MintLicenseTokensResponse> {
        const storyClient = this.walletProvider.getStoryClient();
        const publicClient = this.walletProvider.getPublicClient();

        const hasLicenseTerms = await hasIpAttachedLicenseTerms(publicClient, {
            ipId: params.licensorIpId,
            licenseTemplate: "0x58E2c909D557Cd23EF90D14f8fd21667A5Ae7a93",
            licenseTermsId: BigInt(params.licenseTermsId),
        });
        // check if license terms are attached to the ip asset
        if (!hasLicenseTerms) {
            throw new Error("License terms are not attached to the IP Asset");
        }
        const response = await storyClient.license.mintLicenseTokens({
            licensorIpId: params.licensorIpId,
            licenseTermsId: params.licenseTermsId,
            amount: params.amount || 1,
            txOptions: { waitForTransaction: true },
        });

        return response;
    }
}

export const licenseIPAction = {
    name: "LICENSE_IP",
    description: "License an IP Asset on Story",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting LICENSE_IP handler...");

        // initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const licenseIPContext = composeContext({
            state,
            template: licenseIPTemplate,
        });

        const content = await generateObjectDEPRECATED({
            runtime,
            context: licenseIPContext,
            modelClass: ModelClass.SMALL,
        });

        const walletProvider = new WalletProvider(runtime);
        const action = new LicenseIPAction(walletProvider);
        try {
            const response = await action.licenseIP(content);
            callback?.({
                text: `Successfully minted license tokens: ${response.licenseTokenIds.join(", ")}\nTransaction Hash: ${response.txHash}`,
            });
            return true;
        } catch (e) {
            elizaLogger.error("Error licensing IP:", e.message);
            callback?.({ text: `Error licensing IP: ${e.message}` });
            return false;
        }
    },
    template: licenseIPTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("STORY_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "License an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db with license terms 1",
                    action: "LICENSE_IP",
                },
            },
        ],
    ],
    similes: ["LICENSE", "LICENSE_IP", "LICENSE_IP_ASSET"],
};
