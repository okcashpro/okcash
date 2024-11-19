import { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { videoGenerationPlugin } from "../index";

// Mock the fetch function
global.fetch = jest.fn();

// Mock the fs module
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

describe('Video Generation Plugin', () => {
    let mockRuntime: IAgentRuntime;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock runtime
        mockRuntime = {
            getSetting: jest.fn().mockReturnValue('mock-api-key'),
            agentId: 'mock-agent-id',
            composeState: jest.fn().mockResolvedValue({}),
        } as unknown as IAgentRuntime;

        mockCallback = jest.fn();

        // Setup fetch mock for successful response
        (global.fetch as jest.Mock).mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: 'mock-generation-id',
                    status: 'completed',
                    assets: {
                        video: 'https://example.com/video.mp4'
                    }
                }),
                text: () => Promise.resolve(''),
            })
        );
    });

    it('should validate when API key is present', async () => {
        const mockMessage = {} as Memory;
        const result = await videoGenerationPlugin.actions[0].validate(mockRuntime, mockMessage);
        expect(result).toBe(true);
        expect(mockRuntime.getSetting).toHaveBeenCalledWith('LUMA_API_KEY');
    });

    it('should handle video generation request', async () => {
        const mockMessage = {
            content: {
                text: 'Generate a video of a sunset'
            }
        } as Memory;
        const mockState = {} as State;

        await videoGenerationPlugin.actions[0].handler(
            mockRuntime,
            mockMessage,
            mockState,
            {},
            mockCallback
        );

        // Check initial callback
        expect(mockCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                text: expect.stringContaining('I\'ll generate a video based on your prompt')
            })
        );

        // Check final callback with video
        expect(mockCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                text: 'Here\'s your generated video!',
                attachments: expect.arrayContaining([
                    expect.objectContaining({
                        source: 'videoGeneration'
                    })
                ])
            }),
            expect.arrayContaining([expect.stringMatching(/generated_video_.*\.mp4/)])
        );
    });

    it('should handle API errors gracefully', async () => {
        // Mock API error
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('API Error'),
            })
        );

        const mockMessage = {
            content: {
                text: 'Generate a video of a sunset'
            }
        } as Memory;
        const mockState = {} as State;

        await videoGenerationPlugin.actions[0].handler(
            mockRuntime,
            mockMessage,
            mockState,
            {},
            mockCallback
        );

        // Check error callback
        expect(mockCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                text: expect.stringContaining('Video generation failed'),
                error: true
            })
        );
    });
});