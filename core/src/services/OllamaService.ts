import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import { debuglog } from 'util';

// Create debug logger
const debug = debuglog('LLAMA');

process.on('uncaughtException', (err) => {
  debug('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  debug('Unhandled Rejection at:', promise, 'reason:', reason);
});

interface QueuedMessage {
  context: string;
  temperature: number;
  stop: string[];
  max_tokens: number;
  frequency_penalty: number;
  presence_penalty: number;
  useGrammar: boolean;
  resolve: (value: any | string | PromiseLike<any | string>) => void;
  reject: (reason?: any) => void;
}

class OllamaService {
  private static instance: OllamaService | null = null;
  private openai: OpenAI;
  private modelName: string;
  private embeddingModelName: string =  process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  private messageQueue: QueuedMessage[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    debug('Constructing OllamaService');
    dotenv.config();
    this.modelName = process.env.OLLAMA_MODEL || 'llama3.2';
    this.openai = new OpenAI({
      baseURL: process.env.OLLAMA_SERVER_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama',
      dangerouslyAllowBrowser: true
    });
    debug(`Using model: ${this.modelName}`);
    debug('OpenAI client initialized');
  }

  public static getInstance(): OllamaService {
    debug('Getting OllamaService instance');
    if (!OllamaService.instance) {
      debug('Creating new instance');
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  // Adding initializeModel method to satisfy IOllamaService interface
  public async initializeModel(): Promise<void> {
    debug('Initializing model...');
    try {
      // Placeholder for model setup if needed
      debug(`Model ${this.modelName} initialized successfully.`);
    } catch (error) {
      debug('Error during model initialization:', error);
      throw error;
    }
  }

  async queueMessageCompletion(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number
  ): Promise<any> {
    debug('Queueing message completion');
    return new Promise((resolve, reject) => {
      this.messageQueue.push({
        context,
        temperature,
        stop,
        frequency_penalty,
        presence_penalty,
        max_tokens,
        useGrammar: true,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  async queueTextCompletion(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number
  ): Promise<string> {
    debug('Queueing text completion');
    return new Promise((resolve, reject) => {
      this.messageQueue.push({
        context,
        temperature,
        stop,
        frequency_penalty,
        presence_penalty,
        max_tokens,
        useGrammar: false,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    debug(`Processing queue: ${this.messageQueue.length} items`);
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          const response = await this.getCompletionResponse(
            message.context,
            message.temperature,
            message.stop,
            message.frequency_penalty,
            message.presence_penalty,
            message.max_tokens,
            message.useGrammar
          );
          message.resolve(response);
        } catch (error) {
          debug('Queue processing error:', error);
          message.reject(error);
        }
      }
    }

    this.isProcessing = false;
  }

  private async getCompletionResponse(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number,
    useGrammar: boolean
  ): Promise<any | string> {
    debug('Getting completion response');
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: context }],
        temperature,
        max_tokens,
        stop,
        frequency_penalty,
        presence_penalty,
      });

      const response = completion.choices[0].message.content;

      if (useGrammar && response) {
        try {
          let jsonResponse = JSON.parse(response);
          return jsonResponse;
        } catch {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[1]);
            } catch {
              throw new Error("Failed to parse JSON from response");
            }
          }
          throw new Error("No valid JSON found in response");
        }
      }

      return response || '';
    } catch (error) {
      debug('Completion error:', error);
      throw error;
    }
  }

  async getEmbeddingResponse(input: string): Promise<number[] | undefined> {
    debug('Getting embedding response');
    try {
      const embeddingResponse = await this.openai.embeddings.create({
        model: this.embeddingModelName,
        input,
      });

      return embeddingResponse.data[0].embedding;
    } catch (error) {
      debug('Embedding error:', error);
      return undefined;
    }
  }
}

debug('OllamaService module loaded');
export default OllamaService;
