// TODO: Replace with the vercel ai sdk and support all providers
import { Buffer } from "buffer";
import Together from "together-ai";
import { IAgentRuntime } from "../core/types.ts";
import { getModel, ImageGenModel } from "../core/imageGenModels.ts";
import OpenAI from "openai";

export const generateImage = async (
    data: {
        prompt: string;
        width: number;
        height: number;
        count?: number;
    },
    runtime: IAgentRuntime
): Promise<{
    success: boolean;
    data?: string[];
    error?: any;
}> => {
    const { prompt, width, height } = data;
    let { count } = data;
    if (!count) {
        count = 1;
    }

    const imageGenModel = runtime.imageGenModel;
    const model = getModel(imageGenModel);
    const apiKey =
        imageGenModel === ImageGenModel.TogetherAI
            ? runtime.getSetting("TOGETHER_API_KEY")
            : runtime.getSetting("OPENAI_API_KEY");

    try {
        if (imageGenModel === ImageGenModel.TogetherAI) {
            const together = new Together({ apiKey });
            const response = await together.images.create({
                model: "black-forest-labs/FLUX.1-schnell",
                prompt,
                width,
                height,
                steps: model.steps,
                n: count,
            });
            const urls: string[] = [];
            for (let i = 0; i < response.data.length; i++) {
                //@ts-ignore
                const url = response.data[i].url;
                urls.push(url);
            }
            const base64s = await Promise.all(
                urls.map(async (url) => {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();
                    let base64 = Buffer.from(buffer).toString("base64");
                    base64 = "data:image/jpeg;base64," + base64;
                    return base64;
                })
            );
            return { success: true, data: base64s };
        } else {
            let targetSize = `${width}x${height}`;
            if (
                targetSize !== "1024x1024" &&
                targetSize !== "1792x1024" &&
                targetSize !== "1024x1792"
            ) {
                targetSize = "1024x1024";
            }
            const openai = new OpenAI({ apiKey });
            const response = await openai.images.generate({
                model: model.subModel,
                prompt,
                size: targetSize as "1024x1024" | "1792x1024" | "1024x1792",
                n: count,
                response_format: "b64_json",
            });
            const base64s = response.data.map(
                (image) => `data:image/png;base64,${image.b64_json}`
            );
            return { success: true, data: base64s };
        }
    } catch (error) {
        console.error(error);
        return { success: false, error: error };
    }
};

export const generateCaption = async (
    data: { imageUrl: string },
    runtime: IAgentRuntime
): Promise<{
    title: string;
    description: string;
}> => {
    const { imageUrl } = data;
    const resp = await runtime.imageDescriptionService.describeImage(imageUrl);
    return {
        title: resp.title.trim(),
        description: resp.description.trim(),
    };
};
