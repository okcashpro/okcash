export * from "./providers/connector.provider";
export * from "./providers/wallet.provider";
export * from "./types";

import type { Plugin } from "@ai16z/eliza";
import { flowWalletProvider } from "./providers/wallet.provider";
import { flowConnectorProvider } from "./providers/connector.provider";

export const flowPlugin: Plugin = {
    name: "flow",
    description: "Flow Plugin for Eliza",
    actions: [],
    evaluators: [],
    providers: [flowWalletProvider, flowConnectorProvider],
};

export default flowPlugin;
