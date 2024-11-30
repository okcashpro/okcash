import { coinbaseMassPaymentsPlugin } from "./plugins/massPayments";
import { coinbaseCommercePlugin } from "./plugins/commerce";
import { tradePlugin } from "./plugins/trade";
import { advancedTradePlugin } from "./plugins/advancedTrade";

export const plugins = {
    coinbaseMassPaymentsPlugin,
    coinbaseCommercePlugin,
    tradePlugin,
    advancedTradePlugin,
};

export * from "./plugins/massPayments";
export * from "./plugins/commerce";
export * from "./plugins/trade";
export * from "./plugins/advancedTrade";