import type { Plugin } from '@ai16z/eliza'
import { getOnChainActions } from './actions';
import { erc20, USDC } from '@goat-sdk/plugin-erc20';
import { chain, getWalletClient, walletProvider } from './provider';
import { sendETH } from '@goat-sdk/core';

export const goatPlugin: Plugin = {
    name: "[GOAT] Onchain Actions",
    description: "Base integration plugin",
    providers: [walletProvider],
    evaluators: [],
    services: [],
    actions: [
        ...(await getOnChainActions({
            getWalletClient,
            // Add plugins here based on what actions you want to use
            // See all available plugins at https://ohmygoat.dev/chains-wallets-plugins#plugins
            plugins: [sendETH(), erc20({ tokens: [USDC] })],
            chain: {
                type: "evm",
                id: chain.id,
            },
        })),
    ],
};

export default goatPlugin
