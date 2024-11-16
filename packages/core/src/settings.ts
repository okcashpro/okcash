import { config } from "dotenv";
import fs from "fs";
import path from "path";

export interface Settings {
    MAIN_WALLET_ADDRESS: string;
    OPENAI_API_KEY: string;
    USE_OPENAI_EMBEDDING: string;
    SYSTEM_PROMPT: string;
    OPENROUTER_MODEL: string;
    SMALL_OPENROUTER_MODEL: string;
    MEDIUM_OPENROUTER_MODEL: string;
    LARGE_OPENROUTER_MODEL: string;
    OLLAMA_MODEL: string;
    LARGE_OLLAMA_MODEL: string;
    MEDIUM_OLLAMA_MODEL: string;
    SMALL_OLLAMA_MODEL: string;
    OLLAMA_SERVER_URL: string;
    OLLAMA_EMBEDDING_MODEL: string;
    RPC_URL: string;
    BASE_MINT: string;
    BACKEND_URL: string;
    BACKEND_TOKEN: string;
    BIRDEYE_API_KEY: string;
    HELIUS_API_KEY: string;
    SERVER_PORT: string;
    CAPSOLVER_API_KEY: string;
    CUDA_PATH: string;
}

/**
 * Recursively searches for a .env file starting from the current directory
 * and moving up through parent directories
 */
export function findNearestEnvFile(startDir = process.cwd()) {
    console.error('DEBUG - Starting env file search');
    console.error('DEBUG - Current working directory:', process.cwd());

    // In test environment, use the known working path
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        const testPath = path.join(process.cwd(), '.env.test');
        console.error('DEBUG - Checking test path:', testPath);
        if (fs.existsSync(testPath)) {
            console.error('DEBUG - Found test env file at:', testPath);
            return testPath;
        }
    }

    // Look for regular .env
    let currentDir = startDir;
    const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

    while (currentDir !== path.parse(currentDir).root) {
        const envPath = path.join(currentDir, envFile);
        console.error('DEBUG - Checking path:', envPath);
        if (fs.existsSync(envPath)) {
            console.error('DEBUG - Found env file at:', envPath);
            return envPath;
        }
        currentDir = path.dirname(currentDir);
    }

    console.error('DEBUG - No env file found after checking all paths');
    console.error('DEBUG - Final cwd:', process.cwd());
    console.error('DEBUG - Final NODE_ENV:', process.env.NODE_ENV);
    return null;
}

/**
 * Loads environment variables from the nearest .env file
 */
export function loadEnvConfig() {
    console.error('DEBUG - loadEnvConfig called');
    console.error('DEBUG - Current working directory:', process.cwd());
    console.error('DEBUG - NODE_ENV:', process.env.NODE_ENV);

    const envPath = findNearestEnvFile();

    if (!envPath) {
        throw new Error("No .env file found in current or parent directories.");
    }

    console.error('DEBUG - Loading env file from:', envPath);
    const result = config({ path: envPath });
    if (result.error) {
        throw new Error(`Error loading .env file: ${result.error}`);
    }

    console.error('DEBUG - Successfully loaded env file');

    // Populate the settings object with the environment variables
    Object.assign(settings, process.env);
}

export const settings: Settings = {} as Settings;
