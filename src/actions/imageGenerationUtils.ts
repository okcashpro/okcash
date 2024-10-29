// TODO: Replace with the vercel ai sdk and support all providers
import Anthropic from "@anthropic-ai/sdk";
import { Buffer } from 'buffer';
import Together from "together-ai";

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

export const generateCaption = async (data: {apiKey: string, imageUrl: string}) => {
    const { apiKey, imageUrl } = data;

    try {
        const anthropic = new Anthropic({
            apiKey,
        });

        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const imageType = detectImageType(buffer);
        
        if (!imageType) {
            throw new Error("Invalid image data");
        }

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 8192,
            temperature: 0,
            messages: [
              {
                role: "user",
                content: [
                    {type: "text", text: "What do you see in this image? Generate a caption for it! Keep it short, max one phrase. Caption:"},
                    //@ts-ignore
                    {type: "image", source: {data: base64Data, media_type: `image/${imageType}`, type: "base64"}}
                ]
              },
            ],
            tools: [],
          });

          const responseContent = ((response.content[0] as any).text as string).replace("Caption:", "").trim();
          return { success: true, caption: responseContent };
    } catch (error) {
        console.error(error);
        return { success: false, error: error, caption: "" };
    }
}

function detectImageType(buffer: Buffer): string | null {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'jpeg';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png';
    } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return 'gif';
    } else if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
        return 'bmp';
    }
    return null;
}
