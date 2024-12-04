export * from "./assets/script.defs";
export * from "./assets/transaction.defs";
export * from "./providers/connector.provider";
export * from "./providers/wallet.provider";
export * from "./environment";
export * from "./types";

import type { Plugin } from "@ai16z/eliza";
import { flowWalletProvider } from "./providers/wallet.provider";
import { flowConnectorProvider } from "./providers/connector.provider";
import { transferAction } from "./actions/transfer";

export const flowPlugin: Plugin = {
    name: "flow",
    description: "Flow Plugin for Eliza",
    providers: [flowWalletProvider, flowConnectorProvider],
    actions: [transferAction],
    evaluators: [],
    services: [],
};

export default flowPlugin;
