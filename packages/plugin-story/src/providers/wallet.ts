import type { IAgentRuntime, Provider, Memory, State } from "@ai16z/eliza";
import {
    createPublicClient,
    createWalletClient,
    http,
    formatUnits,
    type PublicClient,
    type WalletClient,
    type Chain,
    type HttpTransport,
    type Address,
    Account,
} from "viem";
import { mainnet, base, storyOdyssey } from "viem/chains";
import type { SupportedChain, ChainConfig, ChainMetadata } from "../types";
import { privateKeyToAccount } from "viem/accounts";

export const DEFAULT_CHAIN_CONFIGS: Record<SupportedChain, ChainMetadata> = {
    odyssey: {
        chainId: 1516,
        name: "Odyssey Testnet",
        chain: storyOdyssey,
        rpcUrl: "https://odyssey.storyrpc.io/",
        nativeCurrency: {
            name: "IP",
            symbol: "IP",
            decimals: 18,
        },
        blockExplorerUrl: "https://odyssey-testnet-explorer.storyscan.xyz",
    },
} as const;

export const getChainConfigs = (runtime: IAgentRuntime) => {
    return (
        (runtime.character.settings.chains?.evm as ChainConfig[]) ||
        DEFAULT_CHAIN_CONFIGS
    );
};

export class WalletProvider {
    private chainConfigs: Record<SupportedChain, ChainConfig>;
    private currentChain: SupportedChain = "odyssey";
    private address: Address;
    runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        if (!privateKey) throw new Error("EVM_PRIVATE_KEY not configured");

        this.runtime = runtime;

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.address = account.address;

        const createClients = (chain: SupportedChain): ChainConfig => {
            const transport = http(getChainConfigs(runtime)[chain].rpcUrl);
            return {
                chain: getChainConfigs(runtime)[chain].chain,
                publicClient: createPublicClient<HttpTransport>({
                    chain: getChainConfigs(runtime)[chain].chain,
                    transport,
                }) as PublicClient<HttpTransport, Chain, Account | undefined>,
                walletClient: createWalletClient<HttpTransport>({
                    chain: getChainConfigs(runtime)[chain].chain,
                    transport,
                    account,
                }),
            };
        };

        this.chainConfigs = {
            odyssey: createClients("odyssey"),
        };
    }

    getAddress(): Address {
        return this.address;
    }

    async getWalletBalance(): Promise<string | null> {
        try {
            const client = this.getPublicClient(this.currentChain);
            const walletClient = this.getWalletClient();
            const balance = await client.getBalance({
                address: walletClient.account.address,
            });
            return formatUnits(balance, 18);
        } catch (error) {
            console.error("Error getting wallet balance:", error);
            return null;
        }
    }

    async connect(): Promise<`0x${string}`> {
        return this.runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`;
    }

    async switchChain(
        runtime: IAgentRuntime,
        chain: SupportedChain
    ): Promise<void> {
        const walletClient = this.chainConfigs[this.currentChain].walletClient;
        if (!walletClient) throw new Error("Wallet not connected");

        try {
            await walletClient.switchChain({
                id: getChainConfigs(runtime)[chain].chainId,
            });
        } catch (error: any) {
            if (error.code === 4902) {
                console.log(
                    "[WalletProvider] Chain not added to wallet (error 4902) - attempting to add chain first"
                );
                await walletClient.addChain({
                    chain: {
                        ...getChainConfigs(runtime)[chain].chain,
                        rpcUrls: {
                            default: {
                                http: [getChainConfigs(runtime)[chain].rpcUrl],
                            },
                            public: {
                                http: [getChainConfigs(runtime)[chain].rpcUrl],
                            },
                        },
                    },
                });
                await walletClient.switchChain({
                    id: getChainConfigs(runtime)[chain].chainId,
                });
            } else {
                throw error;
            }
        }

        this.currentChain = chain;
    }

    getPublicClient(
        chain: SupportedChain
    ): PublicClient<HttpTransport, Chain, Account | undefined> {
        return this.chainConfigs[chain].publicClient;
    }

    getWalletClient(): WalletClient {
        const walletClient = this.chainConfigs[this.currentChain].walletClient;
        if (!walletClient) throw new Error("Wallet not connected");
        return walletClient;
    }

    getCurrentChain(): SupportedChain {
        return this.currentChain;
    }

    getChainConfig(chain: SupportedChain) {
        return getChainConfigs(this.runtime)[chain];
    }
}

export const evmWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        // Check if the user has an EVM wallet
        if (!runtime.getSetting("EVM_PRIVATE_KEY")) {
            return null;
        }

        try {
            const walletProvider = new WalletProvider(runtime);
            const address = walletProvider.getAddress();
            const balance = await walletProvider.getWalletBalance();
            return `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`;
        } catch (error) {
            console.error("Error in EVM wallet provider:", error);
            return null;
        }
    },
};
