import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    Action,
} from "../core/types.ts";
import { prettyConsole } from "../index.ts";
import { generateCaption, generateImage } from "./imageGenerationUtils.ts";

export const imageGeneration: Action = {
    name: "IMAGE_GEN",
    similes: ["GENERATE_IMAGE", "CREATE_IMAGE", "MAKE_PICTURE"],
    description: "Generate an image based on a prompt",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");

        prettyConsole.log("Validating image generation settings...");
        return anthropicApiKeyOk && togetherApiKeyOk;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        prettyConsole.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        prettyConsole.log("User ID:", userId);

        const imagePrompt = message.content.text;
        prettyConsole.log("Image prompt received:", imagePrompt);
        const res: { image: string; caption: string }[] = [];

        prettyConsole.log("Generating image with prompt:", imagePrompt);
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
            prettyConsole.log(
                "Image generation successful, number of images:",
                images.data.length
            );
            for (let i = 0; i < images.data.length; i++) {
                const image = images.data[i];
                prettyConsole.log(`Processing image ${i + 1}:`, image);

                const caption = await generateCaption(
                    {
                        imageUrl: image,
                    },
                    runtime
                );

                prettyConsole.log(
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
            prettyConsole.error("Image generation failed or returned no data.");
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a cat" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a dog" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create an image of a cat with a hat" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Make an image of a dog with a hat" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Paint an image of a cat with a hat" },
            },
        ],
    ],
} as Action;
