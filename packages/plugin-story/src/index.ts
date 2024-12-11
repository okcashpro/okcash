export * from "./actions/registerIP";
export * from "./actions/licenseIP";
export * from "./actions/attachTerms";
export * from "./providers/wallet";
export * from "./actions/getAvailableLicenses";
export * from "./providers/pinata";
export * from "./types";

import type { Plugin } from "@ai16z/eliza";
import { storyWalletProvider } from "./providers/wallet";
import { storyPinataProvider } from "./providers/pinata";
import { registerIPAction } from "./actions/registerIP";
import { licenseIPAction } from "./actions/licenseIP";
import { getAvailableLicensesAction } from "./actions/getAvailableLicenses";
import { attachTermsAction } from "./actions/attachTerms";

export const storyPlugin: Plugin = {
    name: "story",
    description: "Story integration plugin",
    providers: [storyWalletProvider, storyPinataProvider],
    evaluators: [],
    services: [],
    actions: [registerIPAction, licenseIPAction, attachTermsAction, getAvailableLicensesAction],
};

export default storyPlugin;
