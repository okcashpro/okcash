import { config } from "dotenv";
import fs from "fs";
import path from "path";

/**
 * Recursively searches for a .env file starting from the current directory
 * and moving up through parent directories
 * @param {string} [startDir=process.cwd()] - Starting directory for the search
 * @returns {string|null} Path to the nearest .env file or null if not found
 */
export function findNearestEnvFile(startDir = process.cwd()) {
    let currentDir = startDir;

    // Continue searching until we reach the root directory
    while (currentDir !== path.parse(currentDir).root) {
        const envPath = path.join(currentDir, ".env");

        if (fs.existsSync(envPath)) {
            return envPath;
        }

        // Move up to parent directory
        currentDir = path.dirname(currentDir);
    }

    // Check root directory as well
    const rootEnvPath = path.join(path.parse(currentDir).root, ".env");
    return fs.existsSync(rootEnvPath) ? rootEnvPath : null;
}

/**
 * Loads environment variables from the nearest .env file
 * @returns {Object} Environment variables object
 * @throws {Error} If no .env file is found
 */
export function loadEnvConfig() {
    const envPath = findNearestEnvFile();

    if (!envPath) {
        throw new Error("No .env file found in current or parent directories.");
    }

    // Load the .env file
    const result = config({ path: envPath });

    if (result.error) {
        throw new Error(`Error loading .env file: ${result.error}`);
    }

    console.log(`Loaded .env file from: ${envPath}`);
    return process.env;
}

export const settings = loadEnvConfig();
export default settings;
