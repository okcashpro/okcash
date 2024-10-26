import { HandlerCallback, IAgentRuntime, Memory, State, Action } from "../core/types";
import { generateCaption, generateImage } from "./image_gen_utils";

export default {
    name: "IMAGE_GEN",
    similes: ["GENERATE_IMAGE", "CREATE_IMAGE", "MAKE_PICTURE"],
    description: "Generate an image based on a prompt",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");
        return anthropicApiKeyOk && togetherApiKeyOk;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options: any,
      callback: HandlerCallback,
    ) => {
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        
        const imagePrompt = "";
        const res: { image: string, caption: string }[] = [];
        const images = await generateImage({
            apiKey: runtime.getSetting("ANTHROPIC_API_KEY"),
            prompt: imagePrompt,
            width: 1024,
            height: 1024,
            steps: 4,
            count: 1
        })
        if (images.success) {
            for(let i = 0; i < images.data.length; i++) {
                const image = images.data[i];
                const caption = await generateCaption({
                    apiKey: runtime.getSetting("ANTHROPIC_API_KEY"),
                    imageUrl: image.image
                })
                if (caption.success) {
                    res.push({image: image.image, caption: caption.caption});
                } else {
                    console.error("Failed to generate caption for image", image.image, caption.error);
                    res.push({image: image.image, caption: "Uncaptioned image"});
                }
            }
        }
        callback(null, {
            success: true,
            data: res
        });
    },
    examples: [
        [
            {user: "{{user1}}", content: {text: "Generate an image of a cat"}}
        ],
        [
            {user: "{{user1}}", content: {text: "Generate an image of a dog"}}
        ],
        [
            {user: "{{user1}}", content: {text: "Create an image of a cat with a hat"}}
        ],
        [
            {user: "{{user1}}", content: {text: "Make an image of a dog with a hat"}}
        ],
        [
            {user: "{{user1}}", content: {text: "Paint an image of a cat with a hat"}}
        ]
    ]
} as Action;
