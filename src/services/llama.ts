import { fileURLToPath } from "url";
import path from "path";
import { getLlama, LlamaChatSession, LlamaContext, LlamaJsonSchemaGrammar, LlamaModel, Token } from "node-llama-cpp";
import fs from 'fs';
import https from 'https';

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
    private grammar: LlamaJsonSchemaGrammar<any> | undefined;
    ctx: LlamaContext;
    session: LlamaChatSession;
    modelUrl: string;

    constructor() {
        this.llama = undefined;
        this.model = undefined;
        this.modelUrl = "https://cdn-lfs-us-1.huggingface.co/repos/1a/35/1a356434d698e78d7edc87f5552d7ac0141a16aa99fb4b8467bc59b201ce53a8/4fd4066c43347d388c43abdf8a27ea093b83932b10c741574e10a67c6d48e0b0?response-content-disposition=attachment%3B+filename*%3DUTF-8%27%27ggml-model-Q4_K_M.gguf%3B+filename%3D%22ggml-model-Q4_K_M.gguf%22%3B&Expires=1722523448&Policy=eyJTdGF0ZW1lbnQiOlt7IkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTcyMjUyMzQ0OH19LCJSZXNvdXJjZSI6Imh0dHBzOi8vY2RuLWxmcy11cy0xLmh1Z2dpbmdmYWNlLmNvL3JlcG9zLzFhLzM1LzFhMzU2NDM0ZDY5OGU3OGQ3ZWRjODdmNTU1MmQ3YWMwMTQxYTE2YWE5OWZiNGI4NDY3YmM1OWIyMDFjZTUzYTgvNGZkNDA2NmM0MzM0N2QzODhjNDNhYmRmOGEyN2VhMDkzYjgzOTMyYjEwYzc0MTU3NGUxMGE2N2M2ZDQ4ZTBiMD9yZXNwb25zZS1jb250ZW50LWRpc3Bvc2l0aW9uPSoifV19&Signature=UzDhO69kBDC1pYhb0tFbbvkyZMYaPE7xFKQImjShmqazSEUQRIXihp3KGr5xMXN8kx11oenhoCMqcc-pzRIyae9K8cQPjb5-M3eW2zHUXUi3CAXe8G6tNnpH6W6BkJuL6-l%7E-kgpTr44NUA4p8FpABTKWccUmWCeuN5SA3mKOCyMdTdDBgBtDqQ0UEkiVjmYFVwZX6ZTW3AtasPqrfS80Q1z0q-5uEkkdsHi1KVycWpv%7ENCmrHEBH1VXxGmjBa9hVWJS9yY95lq9yyrbdtH%7EWv5TDAFDLrYYqHXx-7x-kB7zbd18T5Aui1kqNvJcxZTnhxW7r3HlrFKAfh5t7oSvOA__&Key-Pair-Id=K24J24Z295AEI9";
        const modelName = "model.gguf";
        console.log("modelName", modelName)
        this.modelPath = path.join(__dirname, modelName);
    }

    async initialize() {
        if (this.llama) {
            return;
        }
        await this.checkModel();
        console.log("Loading llama")
        this.llama = await getLlama();
        console.log("Creating grammar")
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
        this.grammar = grammar;
        console.log("Loading model")
        this.model = await this.llama.loadModel({ modelPath: this.modelPath });
        console.log("Creating context")
        this.ctx = await this.model.createContext();
        console.log("Creating session")
        this.session = new LlamaChatSession({
            contextSequence: this.ctx.getSequence()
        });
    }

    async checkModel() {
        console.log("Checking model");
        if (!fs.existsSync(this.modelPath)) {
            console.log("this.modelPath", this.modelPath);
            console.log("Model not found. Downloading...");

            await new Promise<void>((resolve, reject) => {
                const file = fs.createWriteStream(this.modelPath);
                https.get(this.modelUrl, (response) => {
                    const totalSize = parseInt(response.headers['content-length'], 10);
                    let downloadedSize = 0;

                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        file.write(chunk);
                        
                        // Log progress
                        const progress = (downloadedSize / totalSize * 100).toFixed(2);
                        process.stdout.write(`Downloaded ${progress}%\r`);
                    });

                    response.on('end', () => {
                        file.end();
                        console.log("\nModel downloaded successfully.");
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(this.modelPath, () => {}); // Delete the file async
                    console.error("Download failed:", err.message);
                    reject(err);
                });

                file.on('error', (err) => {
                    fs.unlink(this.modelPath, () => {}); // Delete the file async
                    console.error("File write error:", err.message);
                    reject(err);
                });
            });
        } else {
            console.log("Model already exists.");
        }
    }



    async getCompletionResponse(context: string, temperature: number, stop: string[], frequency_penalty: number, presence_penalty: number): Promise<GrammarData> {
        if (!this.model) {
            throw new Error("Model not initialized. Call initialize() first.");
        }

        const session = this.session
        
        console.log("Prompting")
        const response = await this.session.prompt(context, {
            onToken(chunk: Token[]) {
                process.stdout.write(session.context.model.detokenize(chunk));
            },        
            grammar: this.grammar,
            temperature: Number(temperature),
            customStopTriggers: stop,
            repeatPenalty: {
                frequencyPenalty: frequency_penalty,
                presencePenalty: presence_penalty
            }
        });
        console.log("Parsing response")
        console.log("Response: ", response)
        const parsedResponse: GrammarData = this.grammar.parse(response);
        console.log("Parsed response: ", parsedResponse)
        console.log("AI: " + parsedResponse.responseMessage);
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