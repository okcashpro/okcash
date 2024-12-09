// TODO: Add story actions
export * from "./providers/wallet";
export * from "./types";

import type { Plugin } from "@ai16z/eliza";
import { evmWalletProvider } from "./providers/wallet";

export const evmPlugin: Plugin = {
    name: "evm",
    description: "EVM blockchain integration plugin",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    // TODO: Add actions
    actions: [],
};

export default evmPlugin;
