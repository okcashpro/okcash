import { Plugin } from "@ai16z/eliza";
import { transfer } from "./actions/transfer";
import { bridgeTransfer } from "./actions/bridgeTransfer";

export const confluxPlugin: Plugin = {
    name: "conflux",
    description: "Conflux Plugin for Eliza",
    actions: [transfer, bridgeTransfer],
    providers: [],
};
