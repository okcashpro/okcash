import { stringToUuid } from "@okcashpro/okai";
import { BroadcastResult } from "./types";

export function publicationId({
    pubId,
    agentId,
}: {
    pubId: string;
    agentId: string;
}) {
    return `${pubId}-${agentId}`;
}

export function publicationUuid(props: { pubId: string; agentId: string }) {
    return stringToUuid(publicationId(props));
}

export function populateMentions(
    text: string,
    userIds: number[],
    positions: number[],
    userMap: Record<number, string>
) {
    // Validate input arrays have same length
    if (userIds.length !== positions.length) {
        throw new Error(
            "User IDs and positions arrays must have the same length"
        );
    }

    // Create array of mention objects with position and user info
    const mentions = userIds
        .map((userId, index) => ({
            position: positions[index],
            userId,
            displayName: userMap[userId]!,
        }))
        .sort((a, b) => b.position - a.position); // Sort in reverse order to prevent position shifting

    // Create the resulting string by inserting mentions
    let result = text;
    mentions.forEach((mention) => {
        const mentionText = `@${mention.displayName}`;
        result =
            result.slice(0, mention.position) +
            mentionText +
            result.slice(mention.position);
    });

    return result;
}

export const handleBroadcastResult = (
    broadcastResult: any
): BroadcastResult | undefined => {
    const broadcastValue = broadcastResult.unwrap();

    if ("id" in broadcastValue || "txId" in broadcastValue) {
        return broadcastValue;
    } else {
        throw new Error();
    }
};

export const getProfilePictureUri = (picture: any): string | undefined => {
    if ("optimized" in picture) {
        return picture.optimized?.uri || picture.raw?.uri || picture.uri;
    } else {
        return picture.uri;
    }
};

export function omit<T extends object, K extends string>(
    obj: T,
    key: K
): Omit<T, K> {
    const result: any = {};
    Object.keys(obj).forEach((currentKey) => {
        if (currentKey !== key) {
            result[currentKey] = obj[currentKey];
        }
    });
    return result;
}
