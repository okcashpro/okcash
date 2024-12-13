import type { LensClient } from "./client";
import {
    elizaLogger,
    type Content,
    type IAgentRuntime,
    type Memory,
    type UUID,
} from "@ai16z/eliza";
import { textOnly } from "@lens-protocol/metadata";
import { createPublicationMemory } from "./memory";
import { AnyPublicationFragment } from "@lens-protocol/client";
import StorjProvider from "./providers/StorjProvider";

export async function sendPublication({
    client,
    runtime,
    content,
    roomId,
    commentOn,
    ipfs,
}: {
    client: LensClient;
    runtime: IAgentRuntime;
    content: Content;
    roomId: UUID;
    commentOn?: string;
    ipfs: StorjProvider;
}): Promise<{ memory?: Memory; publication?: AnyPublicationFragment }> {
    // TODO: arweave provider for content hosting
    const metadata = textOnly({ content: content.text });
    const contentURI = await ipfs.pinJson(metadata);

    const publication = await client.createPublication(
        contentURI,
        false, // TODO: support collectable settings
        commentOn
    );

    if (publication) {
        return {
            publication,
            memory: createPublicationMemory({
                roomId,
                runtime,
                publication: publication as AnyPublicationFragment,
            }),
        };
    }

    return {};
}
