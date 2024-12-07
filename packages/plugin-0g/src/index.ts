import { Plugin } from "@okcashpro/eliza";
import { zgUpload } from "./actions/upload";

export const zgPlugin: Plugin = {
    description: "ZeroG Plugin for OKai",
    name: "ZeroG",
    actions: [zgUpload],
    evaluators: [],
    providers: [],
};
