import { Plugin } from "@okcashpro/eliza";
import { transfer } from "./actions/transfer";
import { bridgeTransfer } from "./actions/bridgeTransfer";
import { confiPump } from "./actions/confiPump";

export const confluxPlugin: Plugin = {
    name: "conflux",
    description: "Conflux Plugin for OKai",
    actions: [transfer, bridgeTransfer, confiPump],
    providers: [],
};
