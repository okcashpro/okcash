import { coinbaseMassPaymentsPlugin } from "./plugins/massPayments";
import { coinbaseCommercePlugin } from "./plugins/commerce";

export const plugins = {
    coinbaseMassPaymentsPlugin,
    coinbaseCommercePlugin,
};

export * from "./plugins/massPayments";
export * from "./plugins/commerce";
