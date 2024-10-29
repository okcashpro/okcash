// TODO: Replace with the vercel ai sdk and support all providers
import Anthropic from "@anthropic-ai/sdk";
import { Buffer } from 'buffer';
import Together from "together-ai";
import { AgentRuntime } from "../core/runtime";
import { IAgentRuntime } from "../core/types";

export const generateImage = async (data: {
    apiKey: string, 
    prompt: string, 
    width: number, 
    height: number, 
    steps?: number, 
    count?: number
}): Promise<{
    success: boolean,
    data?: string[],
    error?: any
}> => {
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
        const urls: string[] = [];
        for(let i = 0; i < response.data.length; i++) {
            //@ts-ignore
            const url = response.data[i].url;
            urls.push(url);
        }
        const base64s = await Promise.all(urls.map(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            let base64 = Buffer.from(buffer).toString('base64');
            base64 = "data:image/jpeg;base64," + base64;
            return base64;
        }));
        return { success: true, data: base64s };
  } catch (error) {
        console.error(error);
        return { success: false, error: error };
  }
};

export const generateCaption = async (data: {imageUrl: string}, runtime: IAgentRuntime) => {
    const { imageUrl } = data;
    try {
        const resp = await runtime.imageDescriptionService.describeImage(imageUrl);
        return { success: true, caption: resp.title.trim() };
    } catch (error) {
        console.error(error);
        return { success: false, error: error, caption: "" };
    }
}