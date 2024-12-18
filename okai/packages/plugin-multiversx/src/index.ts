import { Plugin } from "@okcashpro/okai";
import transfer from "./actions/transfer";
import createToken from "./actions/createToken";

export const multiversxPlugin: Plugin = {
    name: "multiversx",
    description: "MultiversX Plugin for OKai",
    actions: [transfer, createToken],
    evaluators: [],
    providers: [],
};

export default multiversxPlugin;
