import { describe, it, expect, vi, beforeEach } from 'vitest';
import knowledge from '../knowledge';
import { AgentRuntime } from '../runtime';
import { KnowledgeItem, Memory } from '../types';
import { getEmbeddingZeroVector } from '../embedding';

// Mock dependencies
vi.mock('../embedding', () => ({
    embed: vi.fn().mockResolvedValue(new Float32Array(1536).fill(0)),
    getEmbeddingZeroVector: vi.fn().mockReturnValue(new Float32Array(1536).fill(0))
}));

vi.mock('../generation', () => ({
    splitChunks: vi.fn().mockImplementation(async (text) => [text])
}));

vi.mock('../uuid', () => ({
    stringToUuid: vi.fn().mockImplementation((str) => str)
}));

describe('Knowledge Module', () => {
    describe('preprocess', () => {
        it('should handle invalid inputs', () => {
            expect(knowledge.preprocess(null)).toBe('');
            expect(knowledge.preprocess(undefined)).toBe('');
            expect(knowledge.preprocess('')).toBe('');
        });

        it('should remove code blocks and inline code', () => {
            const input = 'Here is some code: ```const x = 1;``` and `inline code`';
            expect(knowledge.preprocess(input)).toBe('here is some code: and');
        });

        it('should handle markdown formatting', () => {
            const input = '# Header\n## Subheader\n[Link](http://example.com)\n![Image](image.jpg)';
            expect(knowledge.preprocess(input)).toBe('header subheader link image');
        });

        it('should simplify URLs', () => {
            const input = 'Visit https://www.example.com/path?param=value';
            expect(knowledge.preprocess(input)).toBe('visit example.com/path?param=value');
        });

        it('should remove Discord mentions and HTML tags', () => {
            const input = 'Hello <@123456789> and <div>HTML content</div>';
            expect(knowledge.preprocess(input)).toBe('hello and html content');
        });

        it('should normalize whitespace and newlines', () => {
            const input = 'Multiple    spaces\n\n\nand\nnewlines';
            expect(knowledge.preprocess(input)).toBe('multiple spaces and newlines');
        });

        it('should remove comments', () => {
            const input = '/* Block comment */ Normal text // Line comment';
            expect(knowledge.preprocess(input)).toBe('normal text');
        });
    });

    describe('get and set', () => {
        let mockRuntime: AgentRuntime;

        beforeEach(() => {
            mockRuntime = {
                agentId: 'test-agent',
                knowledgeManager: {
                    searchMemoriesByEmbedding: vi.fn().mockResolvedValue([
                        {
                            content: { text: 'test fragment', source: 'source1' },
                            similarity: 0.9
                        }
                    ]),
                    createMemory: vi.fn().mockResolvedValue(undefined)
                },
                documentsManager: {
                    getMemoryById: vi.fn().mockResolvedValue({
                        id: 'source1',
                        content: { text: 'test document' }
                    }),
                    createMemory: vi.fn().mockResolvedValue(undefined)
                }
            } as unknown as AgentRuntime;
        });

        describe('get', () => {
            it('should handle invalid messages', async () => {
                const invalidMessage = {} as Memory;
                const result = await knowledge.get(mockRuntime, invalidMessage);
                expect(result).toEqual([]);
            });

            it('should retrieve knowledge items based on message content', async () => {
                const message: Memory = {
                    agentId: 'test-agent',
                    content: { text: 'test query' }
                } as unknown as Memory;

                const result = await knowledge.get(mockRuntime, message);

                expect(result).toHaveLength(1);
                expect(result[0]).toEqual({
                    id: 'source1',
                    content: { text: 'test document' }
                });
            });

            it('should handle empty processed text', async () => {
                const message: Memory = {
                    agentId: 'test-agent',
                    content: { text: '```code only```' }
                } as unknown as Memory;

                const result = await knowledge.get(mockRuntime, message);
                expect(result).toEqual([]);
            });
        });

        describe('set', () => {
            it('should store knowledge item and its fragments', async () => {
                const item: KnowledgeItem = {
                    id: 'test-id-1234-5678-9101-112131415161',
                    content: { text: 'test content' }
                };

                await knowledge.set(mockRuntime, item);

                // Check if document was created
                expect(mockRuntime.documentsManager.createMemory).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: item.id,
                        content: item.content,
                        embedding: getEmbeddingZeroVector()
                    })
                );

                // Check if fragment was created
                expect(mockRuntime.knowledgeManager.createMemory).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: {
                            source: item.id,
                            text: expect.any(String)
                        },
                        embedding: expect.any(Float32Array)
                    })
                );
            });

            it('should use default chunk size and bleed', async () => {
                const item: KnowledgeItem = {
                    id: 'test-id-1234-5678-9101-112131415161',
                    content: { text: 'test content' }
                };

                await knowledge.set(mockRuntime, item);

                // Verify default parameters were used
                expect(mockRuntime.knowledgeManager.createMemory).toHaveBeenCalledTimes(1);
            });
        });
    });
});
