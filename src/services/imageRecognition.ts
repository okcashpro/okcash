import {
  env,
  Florence2ForConditionalGeneration,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  type Tensor,
  PreTrainedModel,
  Florence2Processor,
  PreTrainedTokenizer,
} from "@huggingface/transformers";

import fs from "fs";
import gifFrames from "gif-frames";
import os from "os";
import path from "path";
import { AgentRuntime } from "../core/runtime.ts";

class ImageRecognitionService {
  private modelId: string = "onnx-community/Florence-2-base-ft";
  private device: string = "gpu";
  private model: PreTrainedModel | null = null;
  private processor: Florence2Processor | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;
  private initialized: boolean = false;
  runtime: AgentRuntime;

  private queue: string[] = [];
  private processing: boolean = false;

  constructor(runtime: AgentRuntime) {
    this.runtime = runtime;
    this.initialize();
  }

  async initialize(modelId: string | null = null, device: string | null = null): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    this.modelId = modelId || "onnx-community/Florence-2-base-ft";

    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.backends.onnx.logLevel = 'fatal';
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.numThreads = 1;

    console.log("Downloading model...");

    this.model = await Florence2ForConditionalGeneration.from_pretrained(this.modelId, {
      device: 'gpu',
      progress_callback: (progress) => {
        console.log(`Model download progress: ${JSON.stringify(progress.progress)}`);
      },
    });

    console.log("Model downloaded successfully.");

    this.processor = await AutoProcessor.from_pretrained(this.modelId) as Florence2Processor;
    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);

    this.initialized = true;
  }

  async recognizeImage(imageUrl: string): Promise<{ title: string; description: string }> {
    console.log("recognizeImage", imageUrl);

    this.queue.push(imageUrl);
    this.processQueue();

    return new Promise((resolve, reject) => {
      const checkQueue = () => {
        console.log('***** CHECKING QUEUE', this.queue);
        const index = this.queue.indexOf(imageUrl);
        if (index !== -1) {
          setTimeout(checkQueue, 100);
        } else {
          resolve(this.processImage(imageUrl));
        }
      };
      checkQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const imageUrl = this.queue.shift();
      await this.processImage(imageUrl);
    }

    this.processing = false;
  }

  private async processImage(imageUrl: string): Promise<{ title: string; description: string }> {
    console.log('***** PROCESSING IMAGE', imageUrl);
    const isGif = imageUrl.toLowerCase().endsWith(".gif");
    let imageToProcess = imageUrl;

    try {
      if (isGif) {
        console.log("Processing GIF: extracting first frame");
        const { filePath } = await this.extractFirstFrameFromGif(imageUrl);
        imageToProcess = filePath;
      }

      const image = await RawImage.fromURL(imageToProcess);
      const visionInputs = await this.processor(image);

      const prompts = this.processor.construct_prompts("<DETAILED_CAPTION>");
      const textInputs = this.tokenizer(prompts);

      console.log('***** GENERATING')

      const generatedIds = (await this.model.generate({
        ...textInputs,
        ...visionInputs,
        max_new_tokens: 256,
      })) as Tensor;

      console.log('***** GENERATED IDS', generatedIds);

      const generatedText = this.tokenizer.batch_decode(generatedIds, {
        skip_special_tokens: false,
      })[0];

      console.log("***** GENERATED TEXT")
      console.log(generatedText)
      
      const result = this.processor.post_process_generation(generatedText, "<DETAILED_CAPTION>", image.size);

      console.log("***** RESULT")
      console.log(result)

      const detailedCaption = result["<DETAILED_CAPTION>"] as string;

      return { title: detailedCaption, description: detailedCaption };
    } catch (error) {
      console.error("Error in processImage:", error);
    } finally {
      if (isGif && imageToProcess !== imageUrl) {
        fs.unlinkSync(imageToProcess);
      }
    }
  }

  private async extractFirstFrameFromGif(gifUrl: string): Promise<{ filePath: string }> {
    const frameData = await gifFrames({
      url: gifUrl, 
      frames: 1,
      outputType: 'png',
    });
    const firstFrame = frameData[0];

    const tempDir = os.tmpdir();  
    const tempFilePath = path.join(tempDir, `gif_frame_${Date.now()}.png`);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempFilePath);
      firstFrame.getImage().pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({ filePath: tempFilePath });
      });

      writeStream.on('error', reject);
    });
  }
}

export default ImageRecognitionService;