import { Plugin } from "@ai16z/eliza";
import { zgUpload } from "./actions/upload";

export const zgPlugin: Plugin = {
    description: "0G Plugin for Eliza",
    name: "ZeroG",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};
