import { isCastAddMessage } from "@farcaster/hub-nodejs";
import {
    elizaLogger,
    getEmbeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
    type Memory,
    type UUID,
} from "@ai16z/eliza";
import type { Cast } from "./types";
import { toHex } from "viem";
import { castUuid } from "./utils";
import { FarcasterClient } from "./client";

export function createCastMemory({
    roomId,
    runtime,
    cast,
}: {
    roomId: UUID;
    runtime: IAgentRuntime;
    cast: Cast;
}): Memory {
    const inReplyTo = cast.message.data.castAddBody.parentCastId
        ? castUuid({
              hash: toHex(cast.message.data.castAddBody.parentCastId.hash),
              agentId: runtime.agentId,
          })
        : undefined;

    return {
        id: castUuid({
            hash: cast.id,
            agentId: runtime.agentId,
        }),
        agentId: runtime.agentId,
        userId: runtime.agentId,
        content: {
            text: cast.text,
            source: "farcaster",
            url: "",
            inReplyTo,
            hash: cast.id,
        },
        roomId,
        embedding: getEmbeddingZeroVector(),
        createdAt: cast.message.data.timestamp * 1000,
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
        if (visited.has(cast.id)) {
            return;
        }

        visited.add(cast.id);

        const roomId = castUuid({
            hash: currentCast.id,
            agentId: runtime.agentId,
        });

        // Check if the current tweet has already been saved
        const memory = await runtime.messageManager.getMemoryById(roomId);

        if (!memory) {
            elizaLogger.log("Creating memory for cast", cast.id);

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
                    runtime,
                    cast: currentCast,
                })
            );
        }

        thread.unshift(currentCast);

        if (currentCast.message.data.castAddBody.parentCastId) {
            const message = await client.getCast(
                currentCast.message.data.castAddBody.parentCastId
            );

            if (isCastAddMessage(message)) {
                const parentCast = await client.loadCastFromMessage(message);
                await processThread(parentCast);
            }
        }
    }

    await processThread(cast);
}
