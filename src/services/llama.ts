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

  constructor() {
    this.llama = undefined;
    this.model = undefined;
    this.modelUrl =
      "https://huggingface.co/legraphista/Llama-3.1-Minitron-4B-Width-Base-GGUF/resolve/main/Llama-3.1-Minitron-4B-Width-Base.Q8_0.gguf?download=true";
    const modelName = "model.gguf";
    console.log("modelName", modelName);
    this.modelPath = path.join(__dirname, modelName);
  }

  async initialize() {
    if (this.llama) {
      return;
    }
    await this.checkModel();
    console.log("Loading llama");
    this.llama = await getLlama();
    console.log("Creating grammar");
    const grammar = new LlamaJsonSchemaGrammar(
      this.llama,
      jsonSchemaGrammar as GbnfJsonSchema,
    );
    this.grammar = grammar;
    console.log("Loading model");
    console.log("this.modelPath", this.modelPath);
    // check if the model exists
    if (!fs.existsSync(this.modelPath)) {
      throw new Error("Model not found. Call checkModel() first.");
    }
    this.model = await this.llama.loadModel({ modelPath: this.modelPath });
    console.log("Creating context");
    this.ctx = await this.model.createContext();
    console.log("Creating session");
    this.session = new LlamaChatSession({
      contextSequence: this.ctx.getSequence(),
    });
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

  async getCompletionResponse(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
  ): Promise<GrammarData> {
    if (!this.model) {
      throw new Error("Model not initialized. Call initialize() first.");
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
