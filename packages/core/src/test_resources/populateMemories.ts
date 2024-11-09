import { Content, IAgentRuntime, type UUID } from "@ai16z/eliza/src/types.ts";
import { getCachedEmbeddings, writeCachedEmbedding } from "./cache.ts";
import { type User } from "./types.ts";

export async function populateMemories(
    runtime: IAgentRuntime,
    user: User,
    roomId: UUID,
    conversations: Array<
        (userId: UUID) => Array<{ userId: UUID; content: Content }>
    >
) {
    for (const conversation of conversations) {
        for (const c of conversation(user?.id as UUID)) {
            const existingEmbedding = await getCachedEmbeddings(c.content.text);
            const bakedMemory =
                await runtime.messageManager.addEmbeddingToMemory({
                    userId: c.userId as UUID,
                    agentId: runtime.agentId,
                    content: c.content,
                    roomId,
                    embedding: existingEmbedding,
                });
            await runtime.messageManager.createMemory(bakedMemory);
            if (!existingEmbedding) {
                writeCachedEmbedding(
                    c.content.text,
                    bakedMemory.embedding as number[]
                );
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }
    }
}
