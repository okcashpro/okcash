import { fileURLToPath } from "url";
import path from "path";
import { getLlama, LlamaChatSession, LlamaJsonSchemaGrammar } from "node-llama-cpp";
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GrammarData {
    user: String,
    responseMessage: String,
    action: String
}


const getCompletionResponse = async ({ answer, temperature }) => {
    const llama = await getLlama();

    const modelPath = path.join(__dirname, "models", "Meta-Llama-3.1-8B-Instruct.Q2_K.gguf");
    await checkModel(modelPath);

    const model = await llama.loadModel({
        modelPath
    });
    const context = await model.createContext();
    const session = new LlamaChatSession({
        contextSequence: context.getSequence()
    });
    const grammar = new LlamaJsonSchemaGrammar(llama, {
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
    return parsedResponse
}

const checkModel = async (modelPath) => {
    // Download model if it doesn't exist
    if (!fs.existsSync(modelPath)) {
        console.log("Model not found. Downloading...");
        const modelUrl = "https://huggingface.co/chatpdflocal/llama3.1-8b-gguf/resolve/main/ggml-model-Q2_K.gguf?download=true";
        const response = await fetch(modelUrl);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(modelPath, Buffer.from(buffer));
        console.log("Model downloaded successfully.");
    }
}

const getEmbeddingResponse = async (input: string) => {
    const llama = await getLlama();
    const modelPath = path.join(__dirname, "models", "Meta-Llama-3.1-8B-Instruct.Q2_K.gguf");

    await checkModel(modelPath);


    const model = await llama.loadModel({
        modelPath
    });
    const embeddingContext = await model.createEmbeddingContext();

    const embedding = await embeddingContext.getEmbeddingFor(input);
    return embedding?.vector
}

export {
    getCompletionResponse,
    getEmbeddingResponse
}