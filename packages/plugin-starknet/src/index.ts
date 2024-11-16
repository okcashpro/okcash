import { Plugin } from "@ai16z/eliza";
import { executeSwap } from "./actions/swap";

export const starknetPlugin: Plugin = {
    name: "starknet",
    description: "Starknet Plugin for Eliza",
    actions: [executeSwap],
    evaluators: [],
    providers: [],
};

export default starknetPlugin;
