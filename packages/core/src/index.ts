// Exports
export * from "./actions/index.ts";
export * from "./providers/index.ts";
export * from "./core/index.ts";
export * from "./cli/index.ts";

import { elizaLogger as Logging } from "./core/index.ts";

// // Initialize the pretty console
export const elizaLogger = new Logging();
elizaLogger.clear();
elizaLogger.closeByNewLine = true;
elizaLogger.useIcons = true;
