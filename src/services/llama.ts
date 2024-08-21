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
      "https://cdn-lfs-us-1.huggingface.co/repos/77/fa/77fa6eda454ebafe29b05a62c2de140b074bb8beb90cd81a3d5528fa0db92e2e/5880a37f0fd38b083c5dca14aaf697e24b4c9da1cb2f27bde5bbdef35d7a6b17?response-content-disposition=attachment%3B+filename*%3DUTF-8%27%27llama3-8B-DarkIdol-1.0-Q4_K_S-imat.gguf%3B+filename%3D%22llama3-8B-DarkIdol-1.0-Q4_K_S-imat.gguf%22%3B&Expires=1722533805&Policy=eyJTdGF0ZW1lbnQiOlt7IkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTcyMjUzMzgwNX19LCJSZXNvdXJjZSI6Imh0dHBzOi8vY2RuLWxmcy11cy0xLmh1Z2dpbmdmYWNlLmNvL3JlcG9zLzc3L2ZhLzc3ZmE2ZWRhNDU0ZWJhZmUyOWIwNWE2MmMyZGUxNDBiMDc0YmI4YmViOTBjZDgxYTNkNTUyOGZhMGRiOTJlMmUvNTg4MGEzN2YwZmQzOGIwODNjNWRjYTE0YWFmNjk3ZTI0YjRjOWRhMWNiMmYyN2JkZTViYmRlZjM1ZDdhNmIxNz9yZXNwb25zZS1jb250ZW50LWRpc3Bvc2l0aW9uPSoifV19&Signature=YQGVqCSy3Yc0rJDvC6Rs5yIo24772JSlaDh8hjrkKyGNc1OhJr6YsdAf6zjmHcJy0GE2rXqpY4Zmv5ycpwtcE8rCVYmsp7-YhcIq2Ivd-sBXQ-p2fGlrGveN9WcaRqd%7E4%7Eo4YVPSUF0TLIbKNn2jRNOkikW9jaPKHewl0fa-o5Elu-J%7EsbIR9lJFL3PnRRjkCHwVkLMO03wRcrSssTInFhXQzPc5lVrzqVvNkst-WrGig5A8H1zEq85VgeyDnQpPsjXkae%7E4ADa13VHEd0fhEDplYkf2CF-lzztzd7y3UPfoy6WmqX407mnh%7Ep%7E4AaA1YXkYrffkEWveT%7Ewh%7E3EUng__&Key-Pair-Id=K24J24Z295AEI9";
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
        https
          .get(this.modelUrl, (response) => {
            const totalSize = parseInt(
              response.headers["content-length"] ?? "0",
              10,
            );
            let downloadedSize = 0;

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
          })
          .on("error", (err) => {
            fs.unlink(this.modelPath, () => {}); // Delete the file async
            console.error("Download failed:", err.message);
            reject(err);
          });

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
