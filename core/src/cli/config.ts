import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";
import { Action } from "../core/types.ts";

const ROOT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../src");

interface ActionConfig {
    name: string;
    path: string;
}

export function loadActionConfigs(configPath: string): ActionConfig[] {
    if (!fs.existsSync(configPath)) {
        console.error(`Config file not found at path: ${configPath}`);
        return [];
    }

    const configFile = fs.readFileSync(configPath, "utf8");
    const parsedConfig = yaml.load(configFile) as { actions: ActionConfig[] };
    return parsedConfig?.actions || [];
}

export async function loadCustomActions(
    actionConfigs: ActionConfig[]
): Promise<Action[]> {
    const actions = [];

    for (const config of actionConfigs) {
        const resolvedPath = path.resolve(ROOT_DIR, config.path);
        console.log(`Importing action from: ${resolvedPath}`); // Debugging log

        try {
            const actionModule = await import(resolvedPath);
            actions.push(actionModule[config.name]);
        } catch (error) {
            console.error(
                `Failed to import action from ${resolvedPath}:`,
                error
            );
        }
    }
    return actions;
}
