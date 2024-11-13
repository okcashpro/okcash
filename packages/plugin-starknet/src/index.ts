import { Plugin } from "@ai16z/eliza";
// import { executeSwap } from "./actions/swap.ts";
// import take_order from "./actions/takeOrder";
// import pumpfun from "./actions/pumpfun";
// import { executeSwapForDAO } from "./actions/swapDao";
// import { walletProvider } from "./providers/wallet.ts";
// import { trustScoreProvider } from "./providers/trustScoreProvider.ts";
// import { trustEvaluator } from "./evaluators/trust.ts";

export const starknetPlugin: Plugin = {
    name: "Starknet",
    description: "Starknet Plugin for Eliza",
    actions: [
        // executeSwap,
        // pumpfun,
        // executeSwapForDAO,
        // take_order,
    ],
    evaluators: [],
    providers: [],
};

export default starknetPlugin;
