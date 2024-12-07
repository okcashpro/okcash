import { Plugin } from "@okcashpro/okai";
import transferToken from "./actions/transfer.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export { WalletProvider, transferToken as TransferAptosToken };

export const aptosPlugin: Plugin = {
    name: "aptos",
    description: "Aptos Plugin for OKai",
    actions: [transferToken],
    evaluators: [],
    providers: [walletProvider],
};

export default aptosPlugin;
