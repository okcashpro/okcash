import { Plugin } from "@ai16z/eliza";
import { zgUpload } from "./actions/uoload";

export const zgUploadPlugin: Plugin = {
    name: "zgUpload",
    description: "Upload data using 0G protocol",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};
