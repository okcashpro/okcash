import { CastId, FarcasterNetwork, Signer } from "@farcaster/hub-nodejs";
import { CastType, makeCastAdd } from "@farcaster/hub-nodejs";
import type { FarcasterClient } from "./client";
import type { Content, IAgentRuntime, Memory, UUID } from "@ai16z/eliza";
import type { Cast, Profile } from "./types";
import { createCastMemory } from "./memory";
import { splitPostContent } from "./utils";

export async function sendCast({
    client,
    runtime,
    content,
    roomId,
    inReplyTo,
    signer,
    profile,
}: {
    profile: Profile;
    client: FarcasterClient;
    runtime: IAgentRuntime;
    content: Content;
    roomId: UUID;
    signer: Signer;
    inReplyTo?: CastId;
}): Promise<{ memory: Memory; cast: Cast }[]> {
    const chunks = splitPostContent(content.text);
    const sent: Cast[] = [];
    let parentCastId = inReplyTo;

    for (const chunk of chunks) {
        const castAddMessageResult = await makeCastAdd(
            {
                text: chunk,
                embeds: [],
                embedsDeprecated: [],
                mentions: [],
                mentionsPositions: [],
                type: CastType.CAST, // TODO: check CastType.LONG_CAST
                parentCastId,
            },
            {
                fid: profile.fid,
                network: FarcasterNetwork.MAINNET,
            },
            signer
        );

        if (castAddMessageResult.isErr()) {
            throw castAddMessageResult.error;
        }

        await client.submitMessage(castAddMessageResult.value);

        const cast = await client.loadCastFromMessage(
            castAddMessageResult.value
        );

        sent.push(cast);

        parentCastId = {
            fid: cast.profile.fid,
            hash: cast.message.hash,
        };

        // TODO: check rate limiting
        // Wait a bit between tweets to avoid rate limiting issues
        // await wait(1000, 2000);
    }

    return sent.map((cast) => ({
        cast,
        memory: createCastMemory({
            roomId,
            runtime,
            cast,
        }),
    }));
}
