import { config } from "dotenv";
import fs from "fs";
import path from "path";

interface Settings {
    [key: string]: string | undefined;
}

let environmentSettings: Settings = {};

/**
 * Determines if code is running in a browser environment
 * @returns {boolean} True if in browser environment
 */
const isBrowser = (): boolean => {
    return (
        typeof window !== "undefined" && typeof window.document !== "undefined"
    );
};

/**
 * Recursively searches for a .env file starting from the current directory
 * and moving up through parent directories (Node.js only)
 * @param {string} [startDir=process.cwd()] - Starting directory for the search
 * @returns {string|null} Path to the nearest .env file or null if not found
 */
export function findNearestEnvFile(startDir = process.cwd()) {
    if (isBrowser()) return null;

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
 * Configures environment settings for browser usage
 * @param {Settings} settings - Object containing environment variables
 */
export function configureSettings(settings: Settings) {
    environmentSettings = { ...settings };
}

/**
 * Loads environment variables from the nearest .env file in Node.js
 * or returns configured settings in browser
 * @returns {Settings} Environment variables object
 * @throws {Error} If no .env file is found in Node.js environment
 */
export function loadEnvConfig(): Settings {
    // For browser environments, return the configured settings
    if (isBrowser()) {
        return environmentSettings;
    }

    // Node.js environment: load from .env file
    const envPath = findNearestEnvFile();

    // attempt to Load the .env file into process.env
    const result = config(envPath ? { path: envPath } : {});

    if (!result.error) {
        console.log(`Loaded .env file from: ${envPath}`);
    }
    return process.env as Settings;
}

/**
 * Gets a specific environment variable
 * @param {string} key - The environment variable key
 * @param {string} [defaultValue] - Optional default value if key doesn't exist
 * @returns {string|undefined} The environment variable value or default value
 */
export function getEnvVariable(
    key: string,
    defaultValue?: string
): string | undefined {
    if (isBrowser()) {
        return environmentSettings[key] || defaultValue;
    }
    return process.env[key] || defaultValue;
}

/**
 * Checks if a specific environment variable exists
 * @param {string} key - The environment variable key
 * @returns {boolean} True if the environment variable exists
 */
export function hasEnvVariable(key: string): boolean {
    if (isBrowser()) {
        return key in environmentSettings;
    }
    return key in process.env;
}

// Initialize settings based on environment
export const settings = isBrowser() ? environmentSettings : loadEnvConfig();
export default settings;
