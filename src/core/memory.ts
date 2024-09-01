import {
  IAgentRuntimeBase,
  IMemoryManager,
  type Memory,
  type UUID,
} from "./types.ts";

export const embeddingDimension = 1536;
export const embeddingZeroVector = Array(embeddingDimension).fill(0);

const defaultMatchThreshold = 0.1;
const defaultMatchCount = 10;

/**
 * Manage memories in the database.
 */
export class MemoryManager implements IMemoryManager {
  /**
   * The AgentRuntime instance associated with this manager.
   */
  runtime: IAgentRuntimeBase;

  /**
   * The name of the database table this manager operates on.
   */
  tableName: string;

  /**
   * Constructs a new MemoryManager instance.
   * @param opts Options for the manager.
   * @param opts.tableName The name of the table this manager will operate on.
   * @param opts.runtime The AgentRuntime instance associated with this manager.
   */
  constructor(opts: { tableName: string; runtime: IAgentRuntimeBase }) {
    this.runtime = opts.runtime;
    this.tableName = opts.tableName;
  }

  /**
   * Adds an embedding vector to a memory object. If the memory already has an embedding, it is returned as is.
   * @param memory The memory object to add an embedding to.
   * @returns A Promise resolving to the memory object, potentially updated with an embedding vector.
   */
  async addEmbeddingToMemory(memory: Memory): Promise<Memory> {
    if (memory.embedding) {
      return memory;
    }

    const memoryText = memory.content.text;
    if (!memoryText) throw new Error("Memory content is empty");
    memory.embedding = memoryText
      ? await this.runtime.embed(memoryText)
      : embeddingZeroVector.slice();
    return memory;
  }

  /**
   * Retrieves a list of memories by user IDs, with optional deduplication.
   * @param opts Options including user IDs, count, and uniqueness.
   * @param opts.room_id The room ID to retrieve memories for.
   * @param opts.count The number of memories to retrieve.
   * @param opts.unique Whether to retrieve unique memories only.
   * @returns A Promise resolving to an array of Memory objects.
   */
  async getMemories({
    room_id,
    count = 10,
    unique = true,
    user_ids,
  }: {
    room_id: UUID;
    count?: number;
    unique?: boolean;
    user_ids?: UUID[];
  }): Promise<Memory[]> {
    const result = await this.runtime.databaseAdapter.getMemories({
      room_id,
      count,
      unique,
      tableName: this.tableName,
      user_ids,
    });
    return result;
  }

  async getCachedEmbeddings(content: string): Promise<
    {
      embedding: number[];
      levenshtein_score: number;
    }[]
  > {
    const result = await this.runtime.databaseAdapter.getCachedEmbeddings({
      query_table_name: this.tableName,
      query_threshold: 2,
      query_input: content,
      query_field_name: "content",
      query_field_sub_name: "content",
      query_match_count: 10,
    });
    return result;
  }

  /**
   * Searches for memories similar to a given embedding vector.
   * @param embedding The embedding vector to search with.
   * @param opts Options including match threshold, count, user IDs, and uniqueness.
   * @param opts.match_threshold The similarity threshold for matching memories.
   * @param opts.count The maximum number of memories to retrieve.
   * @param opts.room_id The room ID to retrieve memories for.
   * @param opts.unique Whether to retrieve unique memories only.
   * @returns A Promise resolving to an array of Memory objects that match the embedding.
   */
  async searchMemoriesByEmbedding(
    embedding: number[],
    opts: {
      match_threshold?: number;
      count?: number;
      room_id: UUID;
      unique?: boolean;
    },
  ): Promise<Memory[]> {
    const {
      match_threshold = defaultMatchThreshold,
      count = defaultMatchCount,
      room_id,
      unique,
    } = opts;

    const searchOpts = {
      tableName: this.tableName,
      room_id,
      embedding: embedding,
      match_threshold: match_threshold,
      match_count: count,
      unique: !!unique,
    };

    const result =
      await this.runtime.databaseAdapter.searchMemories(searchOpts);

    return result;
  }

  /**
   * Creates a new memory in the database, with an option to check for similarity before insertion.
   * @param memory The memory object to create.
   * @param unique Whether to check for similarity before insertion.
   * @returns A Promise that resolves when the operation completes.
   */
  async createMemory(
    memory: Memory,
    unique = false,
    created_at?: Date,
  ): Promise<void> {
    await this.runtime.databaseAdapter.createMemory(
      memory,
      this.tableName,
      unique,
    );
  }

  /**
   * Removes a memory from the database by its ID.
   * @param memoryId The ID of the memory to remove.
   * @returns A Promise that resolves when the operation completes.
   */
  async removeMemory(memoryId: UUID): Promise<void> {
    await this.runtime.databaseAdapter.removeMemory(memoryId, this.tableName);
  }

  /**
   * Removes all memories associated with a set of user IDs.
   * @param room_id The room ID to remove memories for.
   * @returns A Promise that resolves when the operation completes.
   */
  async removeAllMemories(room_id: UUID): Promise<void> {
    await this.runtime.databaseAdapter.removeAllMemories(
      room_id,
      this.tableName,
    );
  }

  /**
   * Counts the number of memories associated with a set of user IDs, with an option for uniqueness.
   * @param room_id The room ID to count memories for.
   * @param unique Whether to count unique memories only.
   * @returns A Promise resolving to the count of memories.
   */
  async countMemories(room_id: UUID, unique = true): Promise<number> {
    return await this.runtime.databaseAdapter.countMemories(
      room_id,
      unique,
      this.tableName,
    );
  }
}
