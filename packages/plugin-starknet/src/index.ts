import { Plugin } from "@ai16z/eliza";
import { executeSwap } from "./actions/swap";
import {
    getStarknetAccountProvider,
    getStarknetRpcProvider,
} from "./providers/avnu";

export const starknetPlugin: Plugin = {
    name: "Starknet",
    description: "Starknet Swap Plugin for Eliza",
    actions: [executeSwap],
    evaluators: [],
    providers: [getStarknetAccountProvider, getStarknetRpcProvider],
};

export default starknetPlugin;
