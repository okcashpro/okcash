import { Plugin } from "@ai16z/eliza/src/types";
import { walletProvider } from "./providers/wallet";
// import { executeCreateToken } from "./actions/createToken";
import { executeSwap } from "./actions/swap";

export const nearPlugin: Plugin = {
    name: "NEAR",
    description: "Near Protocol Plugin for Eliza",
    providers: [walletProvider],
    actions: [executeSwap],
    evaluators: [],
};

export default nearPlugin;
