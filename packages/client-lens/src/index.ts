import { Client, IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import { WalletProvider } from "@ai16z/plugin-evm";
import { LensClient } from "./client";
import { LensPostManager } from "./post";
import { LensInteractionManager } from "./interactions";
import {
    LensClient as LensClientCore,
    production,
} from "@lens-protocol/client";
import StorjProvider from "./providers/StorjProvider";

export class LensAgentClient implements Client {
    client: LensClient;
    posts: LensPostManager;
    interactions: LensInteractionManager;

    private profileId: `0x${string}`;
    private ipfs: StorjProvider;

    constructor(public runtime: IAgentRuntime) {
        const cache = new Map<string, any>();
        const privateKey = runtime.getSetting(
            "EVM_PRIVATE_KEY"
        ) as `0x${string}`;
        const walletProvider = new WalletProvider(privateKey);
        const walletClient = walletProvider.getWalletClient("polygon");

        this.profileId = runtime.getSetting(
            "LENS_PROFILE_ID"
        )! as `0x${string}`;

        const core = new LensClientCore({
            environment: production,
        });

        this.client = new LensClient({
            runtime: this.runtime,
            core,
            walletClient,
            cache,
            profileId: this.profileId,
        });

        elizaLogger.info("Lens client initialized.");

        this.ipfs = new StorjProvider(runtime);

        this.posts = new LensPostManager(
            this.client,
            this.runtime,
            this.profileId,
            cache,
            this.ipfs
        );

        this.interactions = new LensInteractionManager(
            this.client,
            this.runtime,
            this.profileId,
            cache,
            this.ipfs
        );
    }

    async start() {
        await Promise.all([this.posts.start(), this.interactions.start()]);
    }

    async stop() {
        await Promise.all([this.posts.stop(), this.interactions.stop()]);
    }
}
