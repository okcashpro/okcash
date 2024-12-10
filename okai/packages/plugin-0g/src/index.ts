import { Plugin } from "@okcashpro/okai";
import { zgUpload } from "./actions/upload";

export const zgPlugin: Plugin = {
    description: "ZeroG Plugin for OKai",
    name: "ZeroG",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};
