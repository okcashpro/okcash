import { elizaLogger } from "@ai16z/eliza/src/logger.ts";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@ai16z/eliza/src/types.ts";
import { generateCaption, generateImage } from "@ai16z/eliza/src/generation.ts";

const imageGeneration: Action = {
    name: "GENERATE_IMAGE",
    similes: ["IMAGE_GENERATION", "IMAGE_GEN", "CREATE_IMAGE", "MAKE_PICTURE"],
    description: "Generate an image to go along with the message.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");

        // TODO: Add openai DALL-E generation as well

        return anthropicApiKeyOk && togetherApiKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        const imagePrompt = message.content.text;
        elizaLogger.log("Image prompt received:", imagePrompt);

        // TODO: Generate a prompt for the image

        const res: { image: string; caption: string }[] = [];

        elizaLogger.log("Generating image with prompt:", imagePrompt);
        const images = await generateImage(
            {
                prompt: imagePrompt,
                width: 1024,
                height: 1024,
                count: 1,
            },
            runtime
        );

        if (images.success && images.data && images.data.length > 0) {
            elizaLogger.log(
                "Image generation successful, number of images:",
                images.data.length
            );
            for (let i = 0; i < images.data.length; i++) {
                const image = images.data[i];
                elizaLogger.log(`Processing image ${i + 1}:`, image);

                const caption = await generateCaption(
                    {
                        imageUrl: image,
                    },
                    runtime
                );

                elizaLogger.log(
                    `Generated caption for image ${i + 1}:`,
                    caption.title
                );
                res.push({ image: image, caption: caption.title });

                callback(
                    {
                        text: caption.description,
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                url: image,
                                title: "Generated image",
                                source: "imageGeneration",
                                description: caption.title,
                                text: caption.description,
                            },
                        ],
                    },
                    []
                );
            }
        } else {
            elizaLogger.error("Image generation failed or returned no data.");
        }
    },
    examples: [
        // TODO: We want to generate images in more abstract ways, not just when asked to generate an image

        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a cat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a dog" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Make an image of a dog with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Paint an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
} as Action;

export const imageGenerationPlugin: Plugin = {
    name: "imageGeneration",
    description: "Generate images",
    actions: [imageGeneration],
    evaluators: [],
    providers: [],
};
