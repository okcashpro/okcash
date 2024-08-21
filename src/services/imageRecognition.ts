import { AutoProcessor, AutoTokenizer, Moondream1ForConditionalGeneration, RawImage } from '@xenova/transformers';
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
    }

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
    this.initialized = true;
  }

  async recognizeImage(imageUrl: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Prepare text inputs
    const prompt = 'Describe this image.';

    // if we are using openai, we need to use the openai api and send the image to the openai api
    if (this.device === 'cloud') {
      const response = await this.agent.runtime.completion({
        model: 'gpt-4o-mini',
        context: prompt,
        // TODO: add image
        // image,
      });
      return response;
    }

    const textInputs = this.tokenizer(prompt);

    // Prepare vision inputs
    const image = await RawImage.fromURL(imageUrl);
    const visionInputs = await this.processor(image);

    // Generate response
    const output = await this.model.generate({
      ...textInputs,
      ...visionInputs,
      do_sample: false,
      max_new_tokens: 64,
    });
    const decoded = this.tokenizer.batch_decode(output, { skip_special_tokens: false });
    return decoded;
  }
}

export default ImageRecognitionService;