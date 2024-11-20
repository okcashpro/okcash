import { Client, IAgentRuntime } from "@ai16z/eliza";
import { Signer, NobleEd25519Signer } from "@farcaster/hub-nodejs";
import { Hex, hexToBytes } from "viem";
import { FarcasterClient } from "./client";
import { FarcasterPostManager } from "./post";
import { FarcasterInteractionManager } from "./interactions";

export class FarcasterAgentClient implements Client {
    client: FarcasterClient;
    posts: FarcasterPostManager;
    interactions: FarcasterInteractionManager;

    private signer: Signer;

    constructor(
        public runtime: IAgentRuntime,
        client?: FarcasterClient
    ) {
        const cache = new Map<string, any>();

        this.signer = new NobleEd25519Signer(
            hexToBytes(runtime.getSetting("FARCASTER_PRIVATE_KEY")! as Hex)
        );

        this.client =
            client ??
            new FarcasterClient({
                runtime,
                ssl: true,
                url:
                    runtime.getSetting("FARCASTER_HUB_URL") ??
                    "hub.pinata.cloud",
                cache,
            });

        this.posts = new FarcasterPostManager(
            this.client,
            this.runtime,
            this.signer,
            cache
        );

        this.interactions = new FarcasterInteractionManager(
            this.client,
            this.runtime,
            this.signer,
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
