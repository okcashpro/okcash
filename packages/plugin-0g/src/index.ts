import { Plugin } from "@ai16z/eliza";
import { zgUpload } from "./actions/uoload";

export const zgPlugin: Plugin = {
    name: "ZG",
    description: "Store data using 0G protocol",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};