import { Client, IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import { FarcasterClient } from "./client";
import { FarcasterPostManager } from "./post";
import { FarcasterInteractionManager } from "./interactions";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

export class FarcasterAgentClient implements Client {
    client: FarcasterClient;
    posts: FarcasterPostManager;
    interactions: FarcasterInteractionManager;

    private signerUuid: string;

    constructor(
        public runtime: IAgentRuntime,
        client?: FarcasterClient
    ) {
        const cache = new Map<string, any>();

        this.signerUuid = runtime.getSetting("FARCASTER_NEYNAR_SIGNER_UUID")!;

        const neynarConfig = new Configuration({
            apiKey: runtime.getSetting("FARCASTER_NEYNAR_API_KEY")!,
        });

        const neynarClient = new NeynarAPIClient(neynarConfig);

        this.client =
            client ??
            new FarcasterClient({
                runtime,
                ssl: true,
                url:
                    runtime.getSetting("FARCASTER_HUB_URL") ??
                    "hub.pinata.cloud",
                neynar: neynarClient,
                signerUuid: this.signerUuid,
                cache,
            });

        elizaLogger.info("Farcaster Neynar client initialized.")

        this.posts = new FarcasterPostManager(
            this.client,
            this.runtime,
            this.signerUuid,
            cache
        );

        this.interactions = new FarcasterInteractionManager(
            this.client,
            this.runtime,
            this.signerUuid,
            cache
        );
    }

    async start() {
        await Promise.all([this.posts.start(), this.interactions.start()]);
    }

    async stop() {
        await Promise.all([this.posts.stop(), this.interactions.stop()]);
    }
}
