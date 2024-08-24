import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import https from "https";
import { AgentRuntime } from "../core/runtime.ts";
import {
  Llama,
  LlamaModel,
  LlamaContext,
  getLlama,
  LlamaContextSequence
} from "node-llama-cpp";
import gifFrames from "gif-frames";
import os from "os";

interface QueuedRequest {
  imageUrl: string;
  resolve: (value: { title: string; description: string } | PromiseLike<{ title: string; description: string }>) => void;
  reject: (reason?: any) => void;
}

class ImageRecognitionService {
  private modelPath: string;
  private modelUrl: string;
  private llama: Llama | undefined;
  private model: LlamaModel | undefined;
  private ctx: LlamaContext | undefined;ImageRecognitionService
  private sequence: LlamaContextSequence | undefined;
  private initialized: boolean = false;
  private runtime: AgentRuntime;
  private requestQueue: QueuedRequest[] = [];
  private isProcessing: boolean = false;

  constructor(runtime: AgentRuntime) {
    this.runtime = runtime;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.modelPath = path.join(__dirname, "llava-phi-3-mini.gguf");
    this.modelUrl = "https://huggingface.co/xtuner/llava-phi-3-mini-gguf/resolve/main/llava-phi-3-mini-int4.gguf?download=true";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.checkModel();
      
      console.log("Loading llama");
      this.llama = await getLlama({
        gpu: "auto"
      });
      
      console.log("Loading model");
      this.model = await this.llama.loadModel({ modelPath: this.modelPath });
      
      console.log("Creating context");
      const contextParams = {
        contextSize: 2048,
        gpuLayers: -1, // Use all available GPU layers
      };
      this.ctx = await this.model.createContext(contextParams);
      this.sequence = this.ctx.getSequence();

      this.initialized = true;
      console.log("ImageRecognitionService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ImageRecognitionService:", error);
      throw error;
    }
  }

  private async processImageRecognition(imageUrl: string): Promise<{ title: string; description: string }> {
    if (!this.sequence || !this.model) {
      throw new Error("ImageRecognitionService not properly initialized");
    }

    const imageData = await this.getImageData(imageUrl);
    const base64Image = imageData.toString("base64");

    const prompt = `Analyze the following image:
[IMAGE]data:image/jpeg;base64,${base64Image}[/IMAGE]

Provide a title and description for this image. The response should be in the following format:
Title: <title>
Description: <description>

Be concise and accurate in your analysis.`;

    const tokens = this.model.tokenize(prompt);
    const responseTokens = [];

    for await (const token of this.sequence.evaluate(tokens, {
      temperature: 0.3,
      topP: 0.9,
    })) {
      if(responseTokens.length > 512){
        break;
      }
      responseTokens.push(token);
      const partialResponse = this.model.detokenize(responseTokens);
      if (partialResponse.includes("Description:") && partialResponse.split("Description:")[1].trim().length > 0) {
        break;
      }
    }

    const response = this.model.detokenize(responseTokens);
    const [title, description] = this.parseResponse(response);

    return { title, description };
  }

  async checkModel() {
    console.log("Checking model");
    if (!fs.existsSync(this.modelPath)) {
      console.log("Model not found. Downloading...");
  
      await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(this.modelPath);
        let downloadedSize = 0;
  
        const downloadModel = (url: string) => {
          https.get(url, (response) => {
            const isRedirect = response.statusCode >= 300 && response.statusCode < 400;
            if (isRedirect) {
              const redirectUrl = response.headers.location;
              if (redirectUrl) {
                console.log("Following redirect to:", redirectUrl);
                downloadModel(redirectUrl);
                return;
              } else {
                console.error("Redirect URL not found");
                reject(new Error("Redirect URL not found"));
                return;
              }
            }
  
            const totalSize = parseInt(
              response.headers["content-length"] ?? "0",
              10,
            );
  
            response.on("data", (chunk) => {
              downloadedSize += chunk.length;
              file.write(chunk);
  
              // Log progress
              const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
              process.stdout.write(`Downloaded ${progress}%\r`);
            });
  
            response.on("end", () => {
              file.end();
              console.log("\nModel downloaded successfully.");
              resolve();
            });
          }).on("error", (err) => {
            fs.unlink(this.modelPath, () => {}); // Delete the file async
            console.error("Download failed:", err.message);
            reject(err);
          });
        };
  
        downloadModel(this.modelUrl);
  
        file.on("error", (err) => {
          fs.unlink(this.modelPath, () => {}); // Delete the file async
          console.error("File write error:", err.message);
          reject(err);
        });
      });
    } else {
      console.log("Model already exists.");
    }
  }

  async recognizeImage(imageUrl: string): Promise<{ title: string; description: string }> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ imageUrl, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        if (!this.initialized) {
          await this.initialize();
        }

        const result = await this.processImageRecognition(request.imageUrl);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private parseResponse(response: string): [string, string] {
    const titleMatch = response.match(/Title:\s*(.*)/i);
    const descriptionMatch = response.match(/Description:\s*([\s\S]*)/i);

    const title = titleMatch ? titleMatch[1].trim() : "Untitled";
    const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available.";

    return [title, description];
  }

  private async getImageData(imageUrl: string): Promise<Buffer> {
    const isGif = imageUrl.toLowerCase().endsWith(".gif");

    if (isGif) {
      console.log("Processing GIF: extracting first frame");
      const { data } = await this.extractFirstFrameFromGif(imageUrl);
      return data;
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
  }

  private async extractFirstFrameFromGif(gifUrl: string): Promise<{ filePath: string; data: Buffer }> {
    const frameData = await gifFrames({ url: gifUrl, frames: 1, outputType: "png" });
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