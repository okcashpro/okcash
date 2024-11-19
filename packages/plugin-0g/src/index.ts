import { Plugin } from "@ai16z/eliza";
import { zgUpload } from "./actions/upload";

export const zgPlugin: Plugin = {
    name: "ZG",
    description: "0G Plugin for Eliza",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};
