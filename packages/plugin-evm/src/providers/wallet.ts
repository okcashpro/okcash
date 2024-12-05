import { formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { IAgentRuntime, Provider, Memory, State } from "@ai16z/eliza";
import type {
    Address,
    WalletClient,
    PublicClient,
    Chain,
    HttpTransport,
    Account,
} from "viem";
import * as viemChains from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import type { SupportedChain } from "../types";

export class WalletProvider {
    private currentChain: SupportedChain = "mainnet";
    chains: Record<string, Chain> = { mainnet: viemChains.mainnet };
    account: Account;

    constructor(privateKey: `0x${string}`, chainNames: SupportedChain[]) {
        this.setAccount(privateKey);
        this.setChains(chainNames);

        if (chainNames.length > 0) {
            this.setCurrentChain(chainNames[0]);
        }
    }

    getAddress(): Address {
        return this.account.address;
    }

    getCurrentChain(): Chain {
        return this.chains[this.currentChain];
    }

    getPublicClient(
        chainName: SupportedChain
    ): PublicClient<HttpTransport, Chain, Account | undefined> {
        const { publicClient } = this.createClients(chainName);
        return publicClient;
    }

    getWalletClient(chainName: SupportedChain): WalletClient {
        const { walletClient } = this.createClients(chainName);
        return walletClient;
    }

    async getWalletBalance(): Promise<string | null> {
        try {
            const client = this.getPublicClient(this.currentChain);
            const balance = await client.getBalance({
                address: this.account.address,
            });
            return formatUnits(balance, 18);
        } catch (error) {
            console.error("Error getting wallet balance:", error);
            return null;
        }
    }

    async getWalletBalanceForChain(
        chainName: SupportedChain
    ): Promise<string | null> {
        try {
            const client = this.getPublicClient(chainName);
            const balance = await client.getBalance({
                address: this.account.address,
            });
            return formatUnits(balance, 18);
        } catch (error) {
            console.error("Error getting wallet balance:", error);
            return null;
        }
    }

    addChain(chain: SupportedChain) {
        this.setChains([chain]);
    }

    switchChain(chain: SupportedChain) {
        if (!this.chains[chain]) {
            this.addChain(chain);
        }
        this.setCurrentChain(chain);
    }

    private setAccount = (pk: `0x${string}`) => {
        this.account = privateKeyToAccount(pk);
    };
    private setChains = (chainNames: SupportedChain[]) => {
        chainNames.forEach((name) => {
            const chain = viemChains[name];

            if (!chain?.id) {
                throw new Error("Invalid chain name");
            }

            this.chains[name] = chain;
        });
    };
    private setCurrentChain = (chain: SupportedChain) => {
        this.currentChain = chain;
    };
    private createHttpTransport = (chain: SupportedChain) => {
        return http(this.chains[chain].rpcUrls.default.http[0]);
    };
    private createClients = (chain: SupportedChain) => {
        const transport = this.createHttpTransport(chain);

        return {
            chain: this.chains[chain],
            publicClient: createPublicClient({
                chain: this.chains[chain],
                transport,
            }),
            walletClient: createWalletClient<HttpTransport>({
                chain: this.chains[chain],
                transport,
                account: this.account,
            }),
        };
    };
}

export const evmWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        const chainNames =
            (runtime.character.settings.chains?.evm as SupportedChain[]) || [];

        if (!privateKey) {
            return null;
        }

        try {
            const walletProvider = new WalletProvider(
                privateKey as `0x${string}`,
                chainNames
            );
            const address = walletProvider.getAddress();
            const balance = await walletProvider.getWalletBalance();
            return `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`;
        } catch (error) {
            console.error("Error in EVM wallet provider:", error);
            return null;
        }
    },
};
