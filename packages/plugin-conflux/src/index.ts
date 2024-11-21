import { Plugin } from "@ai16z/eliza";
import { transfer } from "./actions/transfer";

export const confluxPlugin: Plugin = {
    name: "conflux",
    description: "Conflux Plugin for Eliza",
    actions: [transfer],
    providers: [],
};
