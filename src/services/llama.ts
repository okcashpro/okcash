import { fileURLToPath } from "url";
import path from "path";
import {
  GbnfJsonSchema,
  getLlama,
  Llama,
  LlamaChatSession,
  LlamaContext,
  LlamaJsonSchemaGrammar,
  LlamaModel,
  Token,
} from "node-llama-cpp";
import fs from "fs";
import https from "https";
import si from 'systeminformation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jsonSchemaGrammar: Readonly<{
  type: string;
  properties: {
    user: {
      type: string;
    };
    content: {
      type: string;
    };
    action: {
      type: string;
    };
  };
}> = {
  type: "object",
  properties: {
    user: {
      type: "string",
    },
    content: {
      type: "string",
    },
    action: {
      type: "string",
    },
  },
};

interface GrammarData {
  user: string;
  content: string;
  action: string;
}

class LlamaService {
  private llama: Llama | undefined;
  private model: LlamaModel | undefined;
  private modelPath: string;
  private grammar: LlamaJsonSchemaGrammar<GbnfJsonSchema> | undefined;
  ctx: LlamaContext | undefined;
  session: LlamaChatSession | undefined;
  modelUrl: string;
  device: string[] = ["cpu"];

  private messageQueue: string[] = [];
  private modelInitialized: boolean = false;

  constructor() {
    this.llama = undefined;
    this.model = undefined;
    this.modelUrl =
      "https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf?download=true";
    const modelName = "model.gguf";
    console.log("modelName", modelName);
    this.modelPath = path.join(__dirname, modelName);
    this.initializeModel();

  }

  async initializeModel() {
    try {
      await this.checkModel();
      console.log("Loading llama");


    // Dynamically detect available hardware
    const systemInfo = await si.graphics();
    const hasCUDA = systemInfo.controllers.some(controller => controller.vendor.toLowerCase().includes('nvidia'));

    if (hasCUDA) {
      console.log('**** CUDA detected');
    } else {
      console.log('**** No CUDA detected - local response will be slow');
    }

      this.llama = await getLlama({
        gpu: "auto"
      });
      console.log("Creating grammar");
      const grammar = new LlamaJsonSchemaGrammar(
        this.llama,
        jsonSchemaGrammar as GbnfJsonSchema,
      );
      this.grammar = grammar;
      console.log("Loading model");
      console.log("this.modelPath", this.modelPath);

      this.model = await this.llama.loadModel({ modelPath: this.modelPath });
      console.log("Model GPU support", this.llama.getGpuDeviceNames());
      console.log("Creating context");
      this.ctx = await this.model.createContext();
      console.log("Creating session");
      this.session = new LlamaChatSession({
        contextSequence: this.ctx.getSequence(),
      });

      this.modelInitialized = true;
      await this.processMessageQueue();
    } catch (error) {
      console.error("Model initialization failed. Deleting model and retrying...", error);
      await this.deleteModel();
      await this.initializeModel();
    }
  }


  async checkModel() {
    console.log("Checking model");
    if (!fs.existsSync(this.modelPath)) {
      console.log("this.modelPath", this.modelPath);
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

  async deleteModel() {
    if (fs.existsSync(this.modelPath)) {
      fs.unlinkSync(this.modelPath);
      console.log("Model deleted.");
    }
  }

  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.getCompletionResponse(message, 0.7, [], 0, 0);
      }
    }
  }

  async getCompletionResponse(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
  ): Promise<GrammarData> {
    if (!this.modelInitialized) {
      console.log("Model not initialized. Queueing message...");
      this.messageQueue.push(context);
      return Promise.reject(new Error("Model not initialized."));
    }

    const session = this.session;

    console.log("Prompting");
    const response = await this.session?.prompt(context, {
      onToken: (chunk: Token[]) => {
        process.stdout.write(session?.context.model.detokenize(chunk) ?? "");
      },
      grammar: this.grammar,
      temperature: Number(temperature),
      customStopTriggers: stop,
      repeatPenalty: {
        frequencyPenalty: frequency_penalty,
        presencePenalty: presence_penalty,
      },
    });
    console.log("Parsing response");
    console.log("Response: ", response);
    if (!response) {
      throw new Error("Response is undefined");
    }
    // TODO: Probably wrong
    const parsedResponse = (
      this.grammar as LlamaJsonSchemaGrammar<GbnfJsonSchema>
    ).parse(response) as unknown as GrammarData;
    if (!parsedResponse) {
      throw new Error("Parsed response is undefined");
    }
    console.log("Parsed response: ", parsedResponse);
    console.log("AI: " + parsedResponse.content);
    return parsedResponse;
  }

  async getEmbeddingResponse(input: string): Promise<number[] | undefined> {
    if (!this.model) {
      throw new Error("Model not initialized. Call initialize() first.");
    }

    const embeddingContext = await this.model.createEmbeddingContext();
    const embedding = await embeddingContext.getEmbeddingFor(input);
    return embedding?.vector;
  }
}

export default LlamaService;
