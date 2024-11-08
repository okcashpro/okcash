import { Plugin } from "@ai16z/eliza";
import { executeSwap } from "./actions/swap";
// import take_order from "./actions/takeOrder";
// import pumpfun from "./actions/pumpfun";
// import { executeSwapForDAO } from "./actions/swapDao";
import { walletProvider } from "./providers/wallet";

export const solanaPlugin: Plugin = {
    name: "solana",
    description: "Solana Plugin for Eliza",
    actions: [
        executeSwap,
        // pumpfun,
        // executeSwapForDAO,
        // take_order,
    ],
    evaluators: [],
    providers: [walletProvider],
};

export default solanaPlugin;
