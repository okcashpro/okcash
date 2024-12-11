import type { IAgentRuntime, Provider, Memory, State } from "@ai16z/eliza";
import pinataSDK from "@pinata/sdk";

export class PinataProvider {
    private pinata;
    runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        const pinataJWT = runtime.getSetting("PINATA_JWT");
        if (!pinataJWT) throw new Error("PINATA_JWT not configured");

        this.runtime = runtime;

        this.pinata = new pinataSDK({ pinataJWTKey: pinataJWT });
    }

    async uploadJSONToIPFS(jsonMetadata: any): Promise<string> {
        const { IpfsHash } = await this.pinata.pinJSONToIPFS(jsonMetadata);
        return IpfsHash;
    }
}

export const storyPinataProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        // Check if the user has a pinata jwt
        if (!runtime.getSetting("PINATA_JWT")) {
            return null;
        }

        try {
            const pinataProvider = new PinataProvider(runtime);
            return `Story Pinata Provider`;
        } catch (error) {
            console.error("Error in Story wallet provider:", error);
            return null;
        }
    },
};
