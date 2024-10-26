import Together from "together-ai";
import {
    Content,
    Memory,
  } from "../core/types.ts";
import Anthropic from "@anthropic-ai/sdk";

export const generateImage = async (data: {
    apiKey: string, 
    prompt: string, 
    width: number, 
    height: number, 
    steps?: number, 
    count?: number
}) => {
    const { apiKey, prompt, width, height } = data;
    let { steps, count } = data;
    if (!steps) {
        steps = 4;
    }
    if (!count) {
        count = 1;
    }

    try {
        const together = new Together({ apiKey });
        const response = await together.images.create({
            model: "black-forest-labs/FLUX.1-schnell",
            prompt,
            width,
            height,
            steps,
            n: count,
        });
        return { success: true, data: response.data };
  } catch (error) {
        console.error(error);
        return { success: false, error: error, data: null };
  }
};

export const generateCaption = async (data: {apiKey: string, imageUrl: string}) => {
    const { apiKey, imageUrl } = data;

    try {
        const anthropic = new Anthropic({
            apiKey,
        });

        let callbackData: Content = {
            text: undefined, 
            action: "CLAUDE_RESPONSE",
            source: "Claude",
            attachments: [],
        };

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 8192,
            temperature: 0,
            messages: [
              {
                role: "user",
                content: [
                    {type: "text", text: "Find the caption for this image. Reply only with the caption!"},
                    {type: "image", source: {data: imageUrl, media_type: "image/png", type: "base64"}}
                ]
              },
            ],
            tools: [],
          });

          const responseContent = (response.content[0] as any).text;
          return { success: true, caption: responseContent };
    } catch (error) {
        console.error(error);
        return { success: false, error: error, caption: "" };
    }
}