import { Plugin } from "@okcashpro/okai";

import transfer from "./actions/transfer";

export const zksyncEraPlugin: Plugin = {
    name: "zksync-era",
    description: "ZKsync Era Plugin for OKai",
    actions: [transfer],
    evaluators: [],
    providers: [],
};

export default zksyncEraPlugin;