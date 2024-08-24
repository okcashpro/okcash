/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  AutoProcessor,
  AutoTokenizer,
  Moondream1ForConditionalGeneration,
  RawImage,
} from "@xenova/transformers";
import fs from "fs";
import gifFrames from "gif-frames";
import os from "os";
import path from "path";
import { AgentRuntime } from "../core/runtime.ts";
class ImageRecognitionService {
  private modelId: string = "Xenova/moondream2";
  private device: string = "cpu";
  private model: Moondream1ForConditionalGeneration | null;
  private processor: AutoProcessor | null = null;
  private tokenizer: AutoTokenizer | null = null;
  private initialized: boolean = false;
  runtime: AgentRuntime;

  constructor(runtime: AgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(
    modelId: string | null = null,
    device: string | null = null,
    dtype: {
      embed_tokens: string;
      vision_encoder: string;
      decoder_model_merged: string;
    } = {
      embed_tokens: "fp16",
      vision_encoder: "q8",
      decoder_model_merged: "q4",
    },
  ): Promise<void> {
    if (this.initialized) {
      return;
    }
    // check for openai api key
    if (process.env.OPENAI_API_KEY) {
      // start recognition with openai
      this.modelId = modelId || "gpt-4o-mini";
      this.device = "cloud";
    } else {
      // start recognition with xenova
      this.modelId = modelId || "Xenova/moondream2";
      this.device = device || "cpu";

      this.processor = await AutoProcessor.from_pretrained(this.modelId);
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
      this.model = await Moondream1ForConditionalGeneration.from_pretrained(
        this.modelId,
        {
          dtype: {
            embed_tokens: dtype.embed_tokens, // or 'fp32'
            vision_encoder: dtype.vision_encoder, // or 'q8'
            decoder_model_merged: dtype.decoder_model_merged, // or 'q4'
          },
          device: this.device,
        },
      );
    }
    this.initialized = true;
  }

  async recognizeImage(
    imageUrl: string,
  ): Promise<{ title: string; description: string }> {
    console.log("recognizeImage", imageUrl);

    if (!this.initialized) {
      console.log("initializing");
      await this.initialize();
    }

    const isGif = imageUrl.toLowerCase().endsWith(".gif");
    let imageToProcess = imageUrl;
    let imageData: Buffer | null = null;

    try {
      if (isGif) {
        console.log("Processing GIF: extracting first frame");
        const { filePath, data } =
          await this.extractFirstFrameFromGif(imageUrl);
        imageToProcess = filePath;
        imageData = data;
      } else {
        // For non-GIFs, fetch the image data
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageData = Buffer.from(await response.arrayBuffer());
      }

      if (!imageData || imageData.length === 0) {
        throw new Error("Failed to fetch image data");
      }

      const prompt =
        "Describe this image and give it a title. The first line sould be the title, and then a line break, then a detailed description of the image. Respond with the format 'title\ndescription'";

      if (this.device === "cloud") {
        const text = await this.recognizeWithOpenAI(
          imageUrl,
          imageData,
          prompt,
          isGif,
        );
        // split the first line off
        const title = text.split("\n")[0];
        const description = text.split("\n")[1];
        return { title, description };
      } else {
        const text = await this.recognizeWithXenova(imageToProcess, prompt);
        // split the first line off
        const title = text.split("\n")[0];
        const description = text.split("\n")[1];
        return { title, description };
      }
    } catch (error) {
      console.error("Error in recognizeImage:", error);
      throw error;
    } finally {
      if (isGif && imageToProcess !== imageUrl) {
        fs.unlinkSync(imageToProcess);
      }
    }
  }

  private async recognizeWithOpenAI(
    imageUrl: string,
    imageData: Buffer,
    prompt: string,
    isGif: boolean,
  ): Promise<string> {
    for (let retryAttempts = 0; retryAttempts < 3; retryAttempts++) {
      try {
        let body;
        if (isGif) {
          const base64Image = imageData.toString("base64");
          body = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/png;base64,${base64Image}` },
                  },
                ],
              },
            ],
            max_tokens: 500,
          });
        } else {
          body = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            max_tokens: 300,
          });
        }

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: body,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.log(
          `Error during OpenAI request (attempt ${retryAttempts + 1}):`,
          error,
        );
        if (retryAttempts === 2) {
          throw error;
        }
      }
    }
    throw new Error("Failed to recognize image with OpenAI after 3 attempts");
  }

  private async recognizeWithXenova(
    imageToProcess: string,
    prompt: string,
  ): Promise<string> {
    console.log("using Xenova model for image recognition");
    try {
      const image = await RawImage.fromURL(imageToProcess);
      const visionInputs = await this.processor(image);

      const output = await this.model.generate({
        ...this.tokenizer(prompt),
        ...visionInputs,
        do_sample: false,
        max_new_tokens: 64,
      });

      const decoded = this.tokenizer.batch_decode(output, {
        skip_special_tokens: true,
      });

      return decoded[0];
    } catch (error) {
      console.error("Error processing image with Xenova model:", error);
      throw error;
    }
  }

  private async extractFirstFrameFromGif(
    gifUrl: string,
  ): Promise<{ filePath: string; data: Buffer }> {
    const frameData = await gifFrames({
      url: gifUrl,
      frames: 1,
      outputType: "png",
    });
    const firstFrame = frameData[0];

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `gif_frame_${Date.now()}.png`);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempFilePath);
      firstFrame.getImage().pipe(writeStream);

      writeStream.on("finish", () => {
        fs.readFile(tempFilePath, (err, data) => {
          if (err) reject(err);
          else resolve({ filePath: tempFilePath, data });
        });
      });

      writeStream.on("error", reject);
    });
  }
}

export default ImageRecognitionService;
