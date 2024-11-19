import { Plugin } from "@ai16z/eliza";
import { zgStorage } from "./actions/uoload";

export const zgStoragePlugin: Plugin = {
    name: "zgStorage",
    description: "Store data using 0G protocol",
    actions: [zgStorage],
    evaluators: [],
    providers: [],
};
