import { fileURLToPath } from "url";
import path from "path";
import { getLlama, LlamaChatSession, LlamaJsonSchemaGrammar, LlamaModel } from "node-llama-cpp";
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GrammarData {
    user: String,
    responseMessage: String,
    action: String
}

class LlamaService {
    private llama: any;
    private model: LlamaModel | undefined;
    private modelPath: string;

    constructor() {
        this.llama = undefined;
        this.model = undefined;
        this.modelPath = path.join(__dirname, "Meta-Llama-3.1-8B-Instruct.Q2_K.gguf");
    }

    async initialize() {
        if (this.llama) {
            return;
        }
        this.llama = await getLlama();
        await this.checkModel();
        this.model = await this.llama.loadModel({ modelPath: this.modelPath });
    }

    private async checkModel() {
        if (!fs.existsSync(this.modelPath)) {
            console.log("this.modelPath", this.modelPath)
            console.log("Model not found. Downloading...");
            const modelUrl = "https://huggingface.co/chatpdflocal/llama3.1-8b-gguf/resolve/main/ggml-model-Q2_K.gguf?download=true";
            const response = await fetch(modelUrl);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(this.modelPath, Buffer.from(buffer));
            console.log("Model downloaded successfully.");
        }
    }

    async getCompletionResponse(answer: string, temperature: number): Promise<GrammarData> {
        if (!this.model) {
            throw new Error("Model not initialized. Call initialize() first.");
        }

        const context = await this.model.createContext();
        const session = new LlamaChatSession({
            contextSequence: context.getSequence()
        });
        const grammar = new LlamaJsonSchemaGrammar(this.llama, {
            "type": "object",
            "properties": {
                "user": {
                    "type": "string"
                },
                "responseMessage": {
                    "type": "string"
                },
                "action": {
                    "type": "string"
                }
            }
        });

        const response = await session.prompt(answer, {
            grammar,
            temperature: Number(temperature)
        });

        const parsedResponse: GrammarData = grammar.parse(response);

        console.log("AI: " + parsedResponse);
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