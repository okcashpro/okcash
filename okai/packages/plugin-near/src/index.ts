import { Plugin } from "@okcashpro/okai/src/types";
import { walletProvider } from "./providers/wallet";
// import { executeCreateToken } from "./actions/createToken";
import { executeSwap } from "./actions/swap";
import { executeTransfer } from './actions/transfer';

export const nearPlugin: Plugin = {
    name: "NEAR",
    description: "Near Protocol Plugin for OKai",
    providers: [walletProvider],
    actions: [executeSwap, executeTransfer],
    evaluators: [],
};

export default nearPlugin;
