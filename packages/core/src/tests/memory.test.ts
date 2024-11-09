import dotenv from "dotenv";
import {
    getCachedEmbeddings,
    writeCachedEmbedding,
} from "../src/test_resources/cache.ts";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { type User } from "../src/test_resources/types.ts";
import { MemoryManager } from "../src/memory.ts";
import { type Content, type Memory, type UUID } from "../src/types.ts";
import { embed } from "../src/embedding.ts";

dotenv.config({ path: ".dev.vars" });
describe("Memory", () => {
    let memoryManager: MemoryManager;
    let runtime = null;
    let user: User;
    let roomId: UUID = zeroUuid;

    beforeAll(async () => {
        const result = await createRuntime({
            env: process.env as Record<string, string>,
        });
        runtime = result.runtime;
        user = result.session.user;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user?.id as UUID,
            userB: zeroUuid,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data.roomId;

        memoryManager = new MemoryManager({
            tableName: "messages",
            runtime,
        });
    });

    beforeEach(async () => {
        await memoryManager.removeAllMemories(roomId);
    });

    afterAll(async () => {
        await memoryManager.removeAllMemories(roomId);
    });

    test("Search memories by embedding similarity", async () => {
        // Define a base memory and two additional memories, one similar and one dissimilar
        const baseMemoryContent = "Base memory content for testing similarity";
        const similarMemoryContent =
            "Base memory content for testing similarity - Similar memory content to the base memory";
        const dissimilarMemoryContent =
            "Dissimilar memory content, not related";

        // Create and add embedding to the base memory
        const baseMemory = await embed(
            memoryManager.runtime,
            baseMemoryContent
        );

        let embedding = await getCachedEmbeddings(similarMemoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const similarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: similarMemoryContent },
            roomId: roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                similarMemoryContent,
                similarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(similarMemory);

        embedding = await getCachedEmbeddings(dissimilarMemoryContent);

        const dissimilarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: dissimilarMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                dissimilarMemoryContent,
                dissimilarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(dissimilarMemory);

        // Search for memories similar to the base memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            baseMemory!,
            {
                roomId,
                count: 1,
            }
        );

        // Check that the similar memory is included in the search results and the dissimilar one is not or ranks lower
        expect(
            searchedMemories.some(
                (memory) =>
                    (memory.content as Content).text === similarMemoryContent
            )
        ).toBe(true);
        expect(
            searchedMemories.some(
                (memory) =>
                    (memory.content as Content).text === dissimilarMemoryContent
            )
        ).toBe(false);
    }, 60000);

    test("Verify memory similarity and ranking", async () => {
        // Define a set of memories with varying degrees of similarity
        const queryMemoryContent =
            "High similarity content to the query memory";
        const highSimilarityContent =
            "High similarity content to the query memory";
        const lowSimilarityContent =
            "Low similarity content compared to the query";

        let embedding = await getCachedEmbeddings(queryMemoryContent);

        // Create and add embedding to the query memory
        const queryMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: queryMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                queryMemoryContent,
                queryMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(queryMemory);

        embedding = await getCachedEmbeddings(highSimilarityContent);
        // Create and add embedding to the high and low similarity memories
        const highSimilarityMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: highSimilarityContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                highSimilarityContent,
                highSimilarityMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(highSimilarityMemory);

        embedding = await getCachedEmbeddings(lowSimilarityContent);
        const lowSimilarityMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: lowSimilarityContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                lowSimilarityContent,
                lowSimilarityMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(lowSimilarityMemory);

        // Search for memories similar to the query memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            queryMemory.embedding!,
            {
                roomId,
                count: 10,
            }
        );

        // Check that the high similarity memory ranks higher than the low similarity memory
        const highSimilarityIndex = searchedMemories.findIndex(
            (memory) =>
                (memory.content as Content).text === highSimilarityContent
        );
        const lowSimilarityIndex = searchedMemories.findIndex(
            (memory) =>
                (memory.content as Content).text === lowSimilarityContent
        );

        expect(highSimilarityIndex).toBeLessThan(lowSimilarityIndex);
    }, 60000);
});
describe("Memory - Basic tests", () => {
    let memoryManager: MemoryManager;
    let runtime = null;
    let user: User;
    let roomId: UUID;

    // Setup before all tests
    beforeAll(async () => {
        const result = await createRuntime({
            env: process.env as Record<string, string>,
        });
        runtime = result.runtime;
        user = result.session.user;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user?.id as UUID,
            userB: zeroUuid,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data.roomId;

        memoryManager = new MemoryManager({
            tableName: "messages", // Adjust based on your actual table name
            runtime,
        });
    });

    // Cleanup after all tests
    afterAll(async () => {
        await memoryManager.removeAllMemories(roomId);
    });

    test("Memory lifecycle: create, search, count, and remove", async () => {
        const embedding = await getCachedEmbeddings(
            "Test content for memory lifecycle"
        );
        // Create a test memory
        const testMemory: Memory = await memoryManager.addEmbeddingToMemory({
            userId: user.id as UUID,
            content: { text: "Test content for memory lifecycle" },
            roomId: roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                (testMemory.content as Content).text as string,
                testMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(testMemory);

        const createdMemories = await memoryManager.getMemories({
            roomId,
            agentId: runtime.agentId,
            count: 100,
        });

        // Verify creation by counting memories
        const initialCount = await memoryManager.countMemories(roomId, false);
        expect(initialCount).toBeGreaterThan(0);

        // Search memories by embedding
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            testMemory.embedding!,
            {
                roomId,
                count: 5,
            }
        );
        expect(searchedMemories.length).toBeGreaterThan(0);

        // Remove a specific memory
        await memoryManager.removeMemory(createdMemories[0].id!);
        const afterRemovalCount = await memoryManager.countMemories(roomId);
        expect(afterRemovalCount).toBeLessThan(initialCount);

        // Remove all memories for the test user
        await memoryManager.removeAllMemories(roomId);
        const finalCount = await memoryManager.countMemories(roomId);
        expect(finalCount).toEqual(0);
    });
});
describe("Memory - Extended Tests", () => {
    let memoryManager: MemoryManager;
    let runtime = null;
    let user: User;
    let roomId: UUID;

    beforeAll(async () => {
        const result = await createRuntime({
            env: process.env as Record<string, string>,
        });
        runtime = result.runtime;
        user = result.session.user;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user.id as UUID,
            userB: zeroUuid,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data.roomId;

        if (!roomId) throw new Error("Room not found");

        memoryManager = new MemoryManager({
            tableName: "messages",
            runtime,
        });
    });

    beforeEach(async () => {
        await memoryManager.removeAllMemories(roomId);
    });

    afterAll(async () => {
        await memoryManager.removeAllMemories(roomId);
    });

    test("Test cosine similarity value equality", async () => {
        // Define a base memory and two additional memories, one similar and one dissimilar
        const baseMemoryContent = "Base memory content for testing similarity";
        const similarMemoryContent =
            "Base memory content for testing similarity";

        // Create and add embedding to the base memory
        const baseMemory = await embed(
            memoryManager.runtime,
            baseMemoryContent
        );

        const embedding = await getCachedEmbeddings(similarMemoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const similarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: similarMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                similarMemoryContent,
                similarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(similarMemory);

        // Search for memories similar to the base memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            baseMemory!,
            {
                roomId,
                count: 1,
            }
        );

        const memory = searchedMemories[0];

        const similarity = (memory as unknown as { similarity: number })
            .similarity;
        expect(similarity).toBeGreaterThan(0.9);
    });

    test("Test cosine similarity value inequality", async () => {
        // Define a base memory and two additional memories, one similar and one dissimilar
        const baseMemoryContent = "i love u";
        const similarMemoryContent =
            "Cognitive security in the information age";

        // Create and add embedding to the base memory
        const baseMemory = await embed(
            memoryManager.runtime,
            baseMemoryContent
        );

        const embedding = await getCachedEmbeddings(similarMemoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const similarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: similarMemoryContent },
            roomId: roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                similarMemoryContent,
                similarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(similarMemory);

        // Search for memories similar to the base memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            baseMemory!,
            {
                match_threshold: 0.01,
                roomId,
                count: 1,
            }
        );

        const memory = searchedMemories[0];

        const similarity = (memory as unknown as { similarity: number })
            .similarity;

        expect(similarity).toBeLessThan(0.2);
    });

    test("Test unique insert", async () => {
        // Define a base memory and two additional memories, one similar and one dissimilar
        const memoryContent = "Cognitive security in the information age";
        const similarMemoryContent =
            "Cognitive security in the information age";

        let embedding = await getCachedEmbeddings(memoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const newMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: memoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                memoryContent,
                newMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(newMemory, true);

        embedding = await getCachedEmbeddings(similarMemoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const similarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: similarMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                similarMemoryContent,
                similarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(similarMemory, true);

        const allCount = await memoryManager.countMemories(roomId, false);
        const uniqueCount = await memoryManager.countMemories(roomId, true);

        expect(allCount > uniqueCount).toBe(true);
    });

    test("Search memories by embedding similarity", async () => {
        // Define a base memory and two additional memories, one similar and one dissimilar
        const baseMemoryContent = "Base memory content for testing similarity";
        const similarMemoryContent =
            "Base memory content for testing similarity 2";
        const dissimilarMemoryContent = "Dissimilar, not related";

        // Create and add embedding to the base memory
        const baseMemory = await embed(
            memoryManager.runtime,
            baseMemoryContent
        );

        let embedding = await getCachedEmbeddings(similarMemoryContent);

        // Create and add embedding to the similar and dissimilar memories
        const similarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: similarMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                similarMemoryContent,
                similarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(similarMemory);

        embedding = await getCachedEmbeddings(dissimilarMemoryContent);

        const dissimilarMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: dissimilarMemoryContent },
            roomId,
            embedding: await getCachedEmbeddings(dissimilarMemoryContent),
        });
        if (!embedding) {
            writeCachedEmbedding(
                dissimilarMemoryContent,
                dissimilarMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(dissimilarMemory);

        // Search for memories similar to the base memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            baseMemory!,
            {
                roomId,
                count: 1,
            }
        );

        // Check that the similar memory is included in the search results and the dissimilar one is not or ranks lower
        expect(
            searchedMemories.some(
                (memory) =>
                    (memory.content as Content).text === similarMemoryContent
            )
        ).toBe(true);
        expect(
            searchedMemories.some(
                (memory) =>
                    (memory.content as Content).text === dissimilarMemoryContent
            )
        ).toBe(false);
    }, 60000);

    test("Verify memory similarity and ranking", async () => {
        // Define a set of memories with varying degrees of similarity
        const queryMemoryContent =
            "High similarity content to the query memory";
        const highSimilarityContent =
            "High similarity content to the query memory";
        const lowSimilarityContent = "Low similarity, not related";

        let embedding = await getCachedEmbeddings(queryMemoryContent);

        // Create and add embedding to the query memory
        const queryMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: queryMemoryContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                queryMemoryContent,
                queryMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(queryMemory);

        embedding = await getCachedEmbeddings(highSimilarityContent);
        // Create and add embedding to the high and low similarity memories
        const highSimilarityMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: highSimilarityContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                highSimilarityContent,
                highSimilarityMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(highSimilarityMemory);

        embedding = await getCachedEmbeddings(lowSimilarityContent);
        const lowSimilarityMemory = await memoryManager.addEmbeddingToMemory({
            userId: user?.id as UUID,
            content: { text: lowSimilarityContent },
            roomId,
            embedding,
        });
        if (!embedding) {
            writeCachedEmbedding(
                lowSimilarityContent,
                lowSimilarityMemory.embedding as number[]
            );
        }
        await memoryManager.createMemory(lowSimilarityMemory);

        // Search for memories similar to the query memory
        const searchedMemories = await memoryManager.searchMemoriesByEmbedding(
            queryMemory.embedding!,
            {
                roomId,
                count: 10,
            }
        );

        // Check that the high similarity memory ranks higher than the low similarity memory
        const highSimilarityIndex = searchedMemories.findIndex(
            (memory) =>
                (memory.content as Content).text === highSimilarityContent
        );
        const lowSimilarityIndex = searchedMemories.findIndex(
            (memory) =>
                (memory.content as Content).text === lowSimilarityContent
        );

        expect(highSimilarityIndex).toBeLessThan(lowSimilarityIndex);
    }, 60000);
});
