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
import { isCastAddMessage, Message } from "@farcaster/hub-nodejs";
import { FarcasterClient } from "./client";

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
    const castHash = toHex(cast.hash);

    const inReplyTo = cast.data.castAddBody.parentCastId
        ? castUuid({
              hash: toHex(cast.data.castAddBody.parentCastId.hash),
              agentId,
          })
        : undefined;

    return {
        id: castUuid({
            hash: castHash,
            agentId,
        }),
        agentId,
        userId,
        content: {
            text: cast.data.castAddBody.text,
            source: "farcaster",
            url: "",
            inReplyTo,
            hash: castHash,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: cast.data.timestamp * 1000,
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
    const thread: Message[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentCast: Cast) {
        const castHash = toHex(currentCast.hash);

        if (visited.has(castHash)) {
            return;
        }

        visited.add(castHash);

        const roomId = castUuid({
            hash: castHash,
            agentId: runtime.agentId,
        });

        // Check if the current tweet has already been saved
        const memory = await runtime.messageManager.getMemoryById(roomId);

        if (!memory) {
            elizaLogger.log("Creating memory for cast", castHash);

            const userId = stringToUuid(cast.profile.username);

            await runtime.ensureConnection(
                userId,
                roomId,
                cast.profile.username,
                cast.profile.name,
                "farcaster"
            );

            await runtime.messageManager.createMemory(
                createCastMemory({
                    roomId,
                    agentId: runtime.agentId,
                    userId,
                    cast,
                })
            );
        }

        thread.unshift(currentCast);

        if (cast.data.castAddBody.parentCastId) {
            const castMessage = await client.getCast(
                cast.data.castAddBody.parentCastId
            );

            if (isCastAddMessage(castMessage)) {
                const profile = await client.getProfile(castMessage.data.fid);

                const cast = {
                    ...castMessage,
                    profile,
                };
                await processThread(cast);
            }
        }
    }

    await processThread(cast);
}
