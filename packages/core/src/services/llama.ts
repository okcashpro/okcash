import * as dotenv from 'dotenv';
import { ILlamaService, ModelProvider } from '../core/types.ts'; ///ILlamaService';
import OllamaService from './OllamaService.ts';
import LlamaCppService from './LlamaCppService.ts';
import settings from '../core/settings.ts';

dotenv.config();

class LlamaService implements ILlamaService {
    private static instance: LlamaService | null = null;
    private delegate: ILlamaService;
  
    private constructor() {
      const provider = settings.LOCAL_LLAMA_PROVIDER;
      console.log("provider: ", provider)
      if (provider === ModelProvider.OLLAMA) {
        this.delegate = OllamaService.getInstance();
      } else {
        this.delegate = LlamaCppService.getInstance();
      }
    }
  
    public static getInstance(): LlamaService {
      if (!LlamaService.instance) {
        LlamaService.instance = new LlamaService();
      }
      return LlamaService.instance;
    }
  
    async initializeModel(): Promise<void> {
      return this.delegate.initializeModel();
    }
  
    async queueMessageCompletion(
      context: string,
      temperature: number,
      stop: string[],
      frequency_penalty: number,
      presence_penalty: number,
      max_tokens: number
    ): Promise<any> {
      console.log("queueMessageCompletion", context, temperature, stop, frequency_penalty, presence_penalty, max_tokens);
      return this.delegate.queueMessageCompletion(
        context, temperature, stop, frequency_penalty, presence_penalty, max_tokens
      );
    }
  
    async queueTextCompletion(
      context: string,
      temperature: number,
      stop: string[],
      frequency_penalty: number,
      presence_penalty: number,
      max_tokens: number
    ): Promise<string> {
      return this.delegate.queueTextCompletion(
        context, temperature, stop, frequency_penalty, presence_penalty, max_tokens
      );
    }
  
    async getEmbeddingResponse(input: string): Promise<number[] | undefined> {
      return this.delegate.getEmbeddingResponse(input);
    }
  }
  
  export default LlamaService;