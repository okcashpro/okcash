import { Plugin } from "@ai16z/eliza/src/types.ts";
//import { executeSwap } from "./actions/swap.ts";
//import take_order from "./actions/takeOrder";
//import pumpfun from "./actions/pumpfun.ts";
//import { executeSwapForDAO } from "./actions/swapDao";
//import transferToken from "./actions/transfer.ts";
import { walletProvider } from "./providers/wallet.ts";
import { trustScoreProvider } from "./providers/trustScoreProvider.ts";
import { trustEvaluator } from "./evaluators/trust.ts";

export const solanaPlugin: Plugin = {
    name: "solana",
    description: "Solana Plugin for Eliza",
    actions: [
        //executeSwap,
        //pumpfun,
        //transferToken,
        //executeSwapForDAO,
        //take_order,
    ],
    evaluators: [
        trustEvaluator
    ],
    providers: [walletProvider, trustScoreProvider],
};

export default solanaPlugin;
