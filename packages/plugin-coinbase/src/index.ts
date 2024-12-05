import { coinbaseMassPaymentsPlugin } from "./plugins/massPayments";
import { coinbaseCommercePlugin } from "./plugins/commerce";
import { tradePlugin } from "./plugins/trade";
import { tokenContractPlugin } from "./plugins/tokenContract";

export const plugins = {
    coinbaseMassPaymentsPlugin,
    coinbaseCommercePlugin,
    tradePlugin,
    tokenContractPlugin,
};

export * from "./plugins/massPayments";
export * from "./plugins/commerce";
export * from "./plugins/trade";
export * from "./plugins/tokenContract";
