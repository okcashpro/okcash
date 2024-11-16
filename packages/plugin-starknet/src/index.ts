import { Plugin } from "@ai16z/eliza";
import { avnuProvider } from "./providers/avnu.ts";

export const starknetPlugin: Plugin = {
    name: "starknet",
    description: "Starknet Plugin for Eliza",
    actions: [
        // TODO: Add actions like swap, etc.
    ],
    evaluators: [],
    providers: [avnuProvider],
};

export default starknetPlugin;
