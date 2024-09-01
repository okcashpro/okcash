import { type User } from "./types.ts";
import { type AgentRuntime } from "../core/runtime.ts";
import { Content, type UUID } from "../core/types.ts";
import { getCachedEmbeddings, writeCachedEmbedding } from "./cache.ts";

export async function populateMemories(
  runtime: AgentRuntime,
  user: User,
  room_id: UUID,
  conversations: Array<
    (user_id: UUID) => Array<{ user_id: UUID; content: Content }>
  >,
) {
  for (const conversation of conversations) {
    for (const c of conversation(user?.id as UUID)) {
      const existingEmbedding = await getCachedEmbeddings(c.content.text);
      const bakedMemory = await runtime.messageManager.addEmbeddingToMemory({
        user_id: c.user_id as UUID,
        content: {
          text: c.content.text,
          action: c.content.action as string,
        },
        room_id,
        embedding: existingEmbedding,
      });
      await runtime.messageManager.createMemory(bakedMemory);
      if (!existingEmbedding) {
        writeCachedEmbedding(c.content.text, bakedMemory.embedding as number[]);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }
}
