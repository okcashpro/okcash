import { Plugin } from "@ai16z/eliza";

import transfer from "./actions/transfer";

export const zksyncEraPlugin: Plugin = {
    name: "zksync-era",
    description: "ZKsync Era Plugin for Eliza",
    actions: [transfer],
    evaluators: [],
    providers: [],
};

export default zksyncEraPlugin;