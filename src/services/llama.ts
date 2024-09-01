import { fileURLToPath } from "url";
import path from "path";
import {
  GbnfJsonSchema,
  getLlama,
  Llama,
  LlamaContext,
  LlamaContextSequence,
  LlamaJsonSchemaGrammar,
  LlamaModel,
  Token,
  LlamaContextSequenceRepeatPenalty,
} from "node-llama-cpp";
import fs from "fs";
import https from "https";
import si from "systeminformation";
import { wordsToPunish } from "./wordsToPunish.ts";

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
  },
};

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

class LlamaService {
  private llama: Llama | undefined;
  private model: LlamaModel | undefined;
  private modelPath: string;
  private grammar: LlamaJsonSchemaGrammar<GbnfJsonSchema> | undefined;
  private ctx: LlamaContext | undefined;
  private sequence: LlamaContextSequence | undefined;
  private modelUrl: string;

  private messageQueue: QueuedMessage[] = [];
  private isProcessing: boolean = false;
  private modelInitialized: boolean = false;

  constructor() {
    console.log("Constructing");
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

      const systemInfo = await si.graphics();
      const hasCUDA = systemInfo.controllers.some((controller) =>
        controller.vendor.toLowerCase().includes("nvidia"),
      );

      if (hasCUDA) {
        console.log("**** CUDA detected");
      } else {
        console.log("**** No CUDA detected - local response will be slow");
      }

      this.llama = await getLlama({
        gpu: "cuda",
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
      this.ctx = await this.model.createContext({ contextSize: 8192 });
      this.sequence = this.ctx.getSequence();

      this.modelInitialized = true;
      this.processQueue();
    } catch (error) {
      console.error(
        "Model initialization failed. Deleting model and retrying...",
        error,
      );
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
          https
            .get(url, (response) => {
              const isRedirect =
                response.statusCode >= 300 && response.statusCode < 400;
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
                const progress = ((downloadedSize / totalSize) * 100).toFixed(
                  2,
                );
                process.stdout.write(`Downloaded ${progress}%\r`);
              });

              response.on("end", () => {
                file.end();
                console.log("\nModel downloaded successfully.");
                resolve();
              });
            })
            .on("error", (err) => {
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

  async queueMessageCompletion(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number,
  ): Promise<any> {
    console.log("Queueing message completion");
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
    max_tokens: number,
  ): Promise<string> {
    console.log("Queueing text completion");
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
    if (
      this.isProcessing ||
      this.messageQueue.length === 0 ||
      !this.modelInitialized
    ) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          console.log("Processing message");
          const response = await this.getCompletionResponse(
            message.context,
            message.temperature,
            message.stop,
            message.frequency_penalty,
            message.presence_penalty,
            message.max_tokens,
            message.useGrammar,
          );
          message.resolve(response);
        } catch (error) {
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
    useGrammar: boolean,
  ): Promise<any | string> {
    if (!this.sequence) {
      throw new Error("Model not initialized.");
    }

    const tokens = this.model!.tokenize(context);

    // tokenize the words to punish
    const wordsToPunishTokens = wordsToPunish
      .map((word) => this.model!.tokenize(word))
      .flat();

    const repeatPenalty: LlamaContextSequenceRepeatPenalty = {
      punishTokens: () => wordsToPunishTokens,
      penalty: 1.2,
      frequencyPenalty: frequency_penalty,
      presencePenalty: presence_penalty,
    };

    const responseTokens: Token[] = [];
    console.log("Evaluating tokens");
    for await (const token of this.sequence.evaluate(tokens, {
      temperature: Number(temperature),
      repeatPenalty: repeatPenalty,
      grammarEvaluationState: useGrammar ? this.grammar : undefined,
      yieldEogToken: false,
    })) {
      const current = this.model.detokenize([...responseTokens, token]);
      if ([...stop].some((s) => current.includes(s))) {
        console.log("Stop sequence found");
        break;
      }

      // commented out since yieldEogToken is false
      // if current includes '://' and that is not immediate after http or https, then we should break
      if (
        current.includes("://") &&
        !current.slice(-10).includes("http://") &&
        !current.slice(-10).includes("https://")
      ) {
        console.log("Stop sequence found");
        break;
      }

      responseTokens.push(token);
      process.stdout.write(this.model!.detokenize([token]));
      if (useGrammar) {
        if (current.replaceAll("\n", "").includes("}```")) {
          console.log("JSON block found");
          break;
        }
      }
      if (responseTokens.length > max_tokens) {
        console.log("Max tokens reached");
        break;
      }
    }

    const response = this.model!.detokenize(responseTokens);

    if (!response) {
      throw new Error("Response is undefined");
    }

    if (useGrammar) {
      // extract everything between ```json and ```
      let jsonString = response.match(/```json(.*?)```/s)?.[1].trim();
      if (!jsonString) {
        // try parsing response as JSON
        try {
          jsonString = JSON.stringify(JSON.parse(response));
          console.log("parsedResponse", jsonString);
        } catch {
          throw new Error("JSON string not found");
        }
      }
      try {
        const parsedResponse = JSON.parse(jsonString);
        if (!parsedResponse) {
          throw new Error("Parsed response is undefined");
        }
        console.log("AI: " + parsedResponse.content);
        await this.sequence.clearHistory();
        return parsedResponse;
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    } else {
      console.log("AI: " + response);
      await this.sequence.clearHistory();
      return response;
    }
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
