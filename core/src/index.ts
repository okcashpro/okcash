// Exports
export * from "./actions/index.ts";
export * from "./clients/index.ts";
export * from "./adapters/index.ts";
export * from "./providers/index.ts";
export * from "./core/index.ts";
export * from "./cli/index.ts";

import { elizaLog as Logging } from "./core/index.ts";

// // Initialize the pretty console
export const elizaLog = new Logging();
elizaLog.clear();
elizaLog.closeByNewLine = true;
elizaLog.useIcons = true;
