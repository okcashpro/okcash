import { Plugin } from "@okcashpro/okai";
import { icpWalletProvider } from "./providers/wallet";
import { executeCreateToken } from "./actions/createToken";

export const icpPlugin: Plugin = {
    name: "icp",
    description: "Internet Computer Protocol Plugin for OKai",
    providers: [icpWalletProvider],
    actions: [executeCreateToken],
    evaluators: [],
};

export default icpPlugin;
