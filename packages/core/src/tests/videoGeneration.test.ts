import { IAgentRuntime } from "@ai16z/eliza";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the fetch function
global.fetch = vi.fn();

// Mock the fs module
vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            writeFileSync: vi.fn(),
            existsSync: vi.fn(),
            mkdirSync: vi.fn(),
        },
        writeFileSync: vi.fn(),
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
    };
});

// Create a mock VideoService class
class MockVideoService {
    private CONTENT_CACHE_DIR = "./content_cache";

    isVideoUrl(url: string): boolean {
        return (
            url.includes("youtube.com") ||
            url.includes("youtu.be") ||
            url.includes("vimeo.com")
        );
    }

    async downloadMedia(url: string): Promise<string> {
        if (!this.isVideoUrl(url)) {
            throw new Error("Invalid video URL");
        }
        const videoId = url.split("v=")[1] || url.split("/").pop();
        return `${this.CONTENT_CACHE_DIR}/${videoId}.mp4`;
    }
}

describe("Video Service", () => {
    let mockRuntime: IAgentRuntime;
    let mockCallback: ReturnType<typeof vi.fn>;
    let videoService: MockVideoService;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock runtime
        mockRuntime = {
            getSetting: vi.fn().mockReturnValue("mock-api-key"),
            agentId: "mock-agent-id",
            composeState: vi.fn().mockResolvedValue({}),
        } as unknown as IAgentRuntime;

        mockCallback = vi.fn();
        videoService = new MockVideoService();

        // Setup fetch mock for successful response
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        id: "mock-generation-id",
                        status: "completed",
                        assets: {
                            video: "https://example.com/video.mp4",
                        },
                    }),
                text: () => Promise.resolve(""),
            })
        );
    });

    it("should validate video URLs", () => {
        expect(videoService.isVideoUrl("https://www.youtube.com/watch?v=123")).toBe(true);
        expect(videoService.isVideoUrl("https://youtu.be/123")).toBe(true);
        expect(videoService.isVideoUrl("https://vimeo.com/123")).toBe(true);
        expect(videoService.isVideoUrl("https://example.com/video")).toBe(false);
    });

    it("should handle video download", async () => {
        const mockUrl = "https://www.youtube.com/watch?v=123";
        const result = await videoService.downloadMedia(mockUrl);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result).toContain(".mp4");
        expect(result).toContain("123.mp4");
    });

    it("should handle download errors gracefully", async () => {
        const mockUrl = "https://example.com/invalid";
        await expect(videoService.downloadMedia(mockUrl)).rejects.toThrow("Invalid video URL");
    });
});
