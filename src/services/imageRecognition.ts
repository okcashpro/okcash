import { AutoProcessor, AutoTokenizer, Moondream1ForConditionalGeneration, RawImage } from '@xenova/transformers';
import fs from 'fs';
import gifFrames from 'gif-frames';
import os from 'os';
import path from 'path';
import { Agent } from '../core/agent.ts';
class ImageRecognitionService {
  private modelId: string = 'Xenova/moondream2';
  private device: string = 'cpu';
  private model: Moondream1ForConditionalGeneration | null;
  private processor: AutoProcessor | null = null;
  private tokenizer: AutoTokenizer | null = null;
  private initialized: boolean = false;
  agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async initialize(modelId: string = null, device: string = null, dtype: {
    embed_tokens: string;
    vision_encoder: string;
    decoder_model_merged: string;
  } = {
      embed_tokens: 'fp16',
      vision_encoder: 'q8',
      decoder_model_merged: 'q4',
    }): Promise<void> {
    if (this.initialized) {
      return;
    }
    // check for openai api key
    if (process.env.OPENAI_API_KEY) {
      // start recognition with openai
      this.modelId = modelId || 'gpt-4o-mini';
      this.device = 'cloud';
    } else {
      // start recognition with xenova
      this.modelId = modelId || 'Xenova/moondream2';
      this.device = device || 'cpu';

      this.processor = await AutoProcessor.from_pretrained(this.modelId);
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
      this.model = await Moondream1ForConditionalGeneration.from_pretrained(this.modelId, {
        dtype: {
          embed_tokens: dtype.embed_tokens, // or 'fp32'
          vision_encoder: dtype.vision_encoder, // or 'q8'
          decoder_model_merged: dtype.decoder_model_merged, // or 'q4'
        },
        device: this.device,
      });
    }
    this.initialized = true;
  }

  async recognizeImage(imageUrl: string): Promise<string> {
    console.log("recognizeImage", imageUrl);
    
    if (!this.initialized) {
      console.log("initializing");
      await this.initialize();
    }
  
    const isGif = imageUrl.toLowerCase().endsWith('.gif');
    let imageToProcess = imageUrl;
    let imageData: Buffer | null = null;
  
    if (isGif) {
      console.log("Processing GIF: extracting first frame");
      const { filePath, data } = await this.extractFirstFrameFromGif(imageUrl);
      imageToProcess = filePath;
      imageData = data;
    }
  
    const prompt = 'Describe this image.';
  
    if (this.device === 'cloud') {
      for (let retryAttempts = 0; retryAttempts < 3; retryAttempts++) {
        try {
          let body;
          if (isGif) {
            // For GIFs, send the extracted frame data
            const base64Image = imageData.toString('base64');
            body = JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/png;${base64Image}` } }
                  ]
                },
              ],
              max_tokens: 500,
            });
          } else {
            // For non-GIFs, send the URL directly
            body = JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageUrl } }
                  ]
                },
              ],
              max_tokens: 300,
            });
          }
  
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: body,
          });
  
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
  
          const data = await response.json();
          const completion = data.choices[0].message.content;
          
          if (isGif) {
            fs.unlinkSync(imageToProcess);
          }
  
          return completion;
        } catch (error) {
          console.log("Error during OpenAI request:", error);
          if (retryAttempts === 2) {
            throw error;
          }
        }
      }
    }
  
    // Local processing (Xenova model)
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
      
      const decoded = this.tokenizer.batch_decode(output, { skip_special_tokens: true });
  
      if (isGif) {
        fs.unlinkSync(imageToProcess);
      }
  
      return decoded[0];
    } catch (error) {
      console.error("Error processing image with Xenova model:", error);
      throw error;
    }
  }
  
  private async extractFirstFrameFromGif(gifUrl: string): Promise<{ filePath: string, data: Buffer }> {
    const frameData = await gifFrames({ url: gifUrl, frames: 1, outputType: 'png' });
    const firstFrame = frameData[0];
  
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `gif_frame_${Date.now()}.png`);
  
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempFilePath);
      firstFrame.getImage().pipe(writeStream);
  
      writeStream.on('finish', () => {
        fs.readFile(tempFilePath, (err, data) => {
          if (err) reject(err);
          else resolve({ filePath: tempFilePath, data });
        });
      });
  
      writeStream.on('error', reject);
    });
  }
  
}

export default ImageRecognitionService;