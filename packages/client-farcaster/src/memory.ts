import {
    elizaLogger,
    embeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
    type Memory,
    type UUID,
} from "@ai16z/eliza";
import type { Cast } from "./types";
import { toHex } from "viem";
import { castUuid } from "./utils";
import { FarcasterClient } from "./client";

//TODO refactor for neynar responses
export function createCastMemory({
    roomId,
    agentId,
    userId,
    cast,
}: {
    roomId: UUID;
    agentId: UUID;
    userId: UUID;
    cast: Cast;
}): Memory {
    const inReplyTo = cast.inReplyTo
        ? castUuid({
              hash: toHex(cast.inReplyTo.hash),
              agentId,
          })
        : undefined;

    return {
        id: castUuid({
            hash: cast.hash,
            agentId,
        }),
        agentId,
        userId,
        content: {
            text: cast.text,
            source: "farcaster",
            url: "",
            inReplyTo,
            hash: cast.hash,
        },
        roomId,
        embedding: embeddingZeroVector,
    };
}

export async function buildConversationThread({
    cast,
    runtime,
    client,
}: {
    cast: Cast;
    runtime: IAgentRuntime;
    client: FarcasterClient;
}): Promise<void> {
    const thread: Cast[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentCast: Cast) {
        if (visited.has(cast.hash)) {
            return;
        }

        visited.add(cast.hash);

        const roomId = castUuid({
            hash: currentCast.hash,
            agentId: runtime.agentId,
        });

        // Check if the current cast has already been saved
        const memory = await runtime.messageManager.getMemoryById(roomId);

        if (!memory) {
            elizaLogger.log("Creating memory for cast", cast.hash);

            const userId = stringToUuid(cast.profile.username);

            await runtime.ensureConnection(
                userId,
                roomId,
                currentCast.profile.username,
                currentCast.profile.name,
                "farcaster"
            );

            await runtime.messageManager.createMemory(
                createCastMemory({
                    roomId,
                    agentId: runtime.agentId,
                    userId,
                    cast: currentCast,
                })
            );
        }

        thread.unshift(currentCast);

        if (currentCast.inReplyTo) {
            const parentCast = await client.getCast(currentCast.inReplyTo.hash);
            await processThread(parentCast);
        }
    }

    await processThread(cast);
}
