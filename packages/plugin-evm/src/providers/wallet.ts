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
import {
    mainnet,
    base,
    sepolia,
    bnbSmartChain,
    arbitrumOne,
    avalancheCChain,
    polygon,
    optimism,
    cronos,
    gnosis,
    fantom,
    klaytn,
    celo,
    moonbeam,
    aurora,
    harmony,
    moonriver,
    arbitrumNova,
    mantle,
    linea,
    scroll,
    filecoin,
    taiko,
    zkSync,
    canto
} from "viem/chains";

import type { SupportedChain, ChainConfig, ChainMetadata } from "../types";
import { privateKeyToAccount } from "viem/accounts";

export const DEFAULT_CHAIN_CONFIGS: Record<SupportedChain, ChainMetadata> = {
    ethereum: {
        chainId: 1,
        name: "Ethereum",
        chain: mainnet,
        rpcUrl: "https://eth.llamarpc.com",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://etherscan.io"
    },
    base: {
        chainId: 8453,
        name: "Base",
        chain: base,
        rpcUrl: "https://base.llamarpc.com",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://basescan.org"
    },
    sepolia: {
        chainId: 11155111,
        name: "Sepolia",
        chain: sepolia,
        rpcUrl: "https://rpc.sepolia.org",
        nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://sepolia.etherscan.io"
    },
    bnbSmartChain: {
        chainId: 56,
        name: "BNB Smart Chain",
        chain: bnbSmartChain,
        rpcUrl: "https://bsc-dataseed1.binance.org/",
        nativeCurrency: {
            name: "Binance Coin",
            symbol: "BNB",
            decimals: 18
        },
        blockExplorerUrl: "https://bscscan.com"
    },
    arbitrumOne: {
        chainId: 42161,
        name: "Arbitrum One",
        chain: arbitrumOne,
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://arbiscan.io"
    },
    avalancheCChain: {
        chainId: 43114,
        name: "Avalanche C-Chain",
        chain: avalancheCChain,
        rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        nativeCurrency: {
            name: "Avalanche",
            symbol: "AVAX",
            decimals: 18
        },
        blockExplorerUrl: "https://snowtrace.io"
    },
    polygon: {
        chainId: 137,
        name: "Polygon",
        chain: polygon,
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18
        },
        blockExplorerUrl: "https://polygonscan.com"
    },
    optimism: {
        chainId: 10,
        name: "Optimism",
        chain: optimism,
        rpcUrl: "https://mainnet.optimism.io",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://optimistic.etherscan.io"
    },
    cronos: {
        chainId: 25,
        name: "Cronos",
        chain: cronos,
        rpcUrl: "https://evm.cronos.org",
        nativeCurrency: {
            name: "Cronos",
            symbol: "CRO",
            decimals: 18
        },
        blockExplorerUrl: "https://cronoscan.com"
    },
    gnosis: {
        chainId: 100,
        name: "Gnosis",
        chain: gnosis,
        rpcUrl: "https://rpc.gnosischain.com",
        nativeCurrency: {
            name: "xDAI",
            symbol: "XDAI",
            decimals: 18
        },
        blockExplorerUrl: "https://gnosisscan.io"
    },
    fantom: {
        chainId: 250,
        name: "Fantom",
        chain: fantom,
        rpcUrl: "https://rpc.ftm.tools",
        nativeCurrency: {
            name: "Fantom",
            symbol: "FTM",
            decimals: 18
        },
        blockExplorerUrl: "https://ftmscan.com"
    },
    klaytn: {
        chainId: 8217,
        name: "Klaytn",
        chain: klaytn,
        rpcUrl: "https://public-node-api.klaytnapi.com/v1/cypress",
        nativeCurrency: {
            name: "KLAY",
            symbol: "KLAY",
            decimals: 18
        },
        blockExplorerUrl: "https://scope.klaytn.com"
    },
    celo: {
        chainId: 42220,
        name: "Celo",
        chain: celo,
        rpcUrl: "https://forno.celo.org",
        nativeCurrency: {
            name: "Celo",
            symbol: "CELO",
            decimals: 18
        },
        blockExplorerUrl: "https://celoscan.io"
    },
    moonbeam: {
        chainId: 1284,
        name: "Moonbeam",
        chain: moonbeam,
        rpcUrl: "https://rpc.api.moonbeam.network",
        nativeCurrency: {
            name: "Glimmer",
            symbol: "GLMR",
            decimals: 18
        },
        blockExplorerUrl: "https://moonscan.io"
    },
    aurora: {
        chainId: 1313161554,
        name: "Aurora",
        chain: aurora,
        rpcUrl: "https://mainnet.aurora.dev",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://aurorascan.dev"
    },
    harmony: {
        chainId: 1666600000,
        name: "Harmony",
        chain: harmony,
        rpcUrl: "https://api.harmony.one",
        nativeCurrency: {
            name: "ONE",
            symbol: "ONE",
            decimals: 18
        },
        blockExplorerUrl: "https://explorer.harmony.one"
    },
    moonriver: {
        chainId: 1285,
        name: "Moonriver",
        chain: moonriver,
        rpcUrl: "https://rpc.api.moonriver.moonbeam.network",
        nativeCurrency: {
            name: "Moonriver",
            symbol: "MOVR",
            decimals: 18
        },
        blockExplorerUrl: "https://moonriver.moonscan.io"
    },
    arbitrumNova: {
        chainId: 42170,
        name: "Arbitrum Nova",
        chain: arbitrumNova,
        rpcUrl: "https://nova.arbitrum.io/rpc",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://nova-explorer.arbitrum.io"
    },
    mantle: {
        chainId: 5000,
        name: "Mantle",
        chain: mantle,
        rpcUrl: "https://rpc.mantle.xyz",
        nativeCurrency: {
            name: "Mantle",
            symbol: "MNT",
            decimals: 18
        },
        blockExplorerUrl: "https://explorer.mantle.xyz"
    },
    linea: {
        chainId: 59144,
        name: "Linea",
        chain: linea,
        rpcUrl: "https://linea-mainnet.rpc.build",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://lineascan.build"
    },
    scroll: {
        chainId: 534353,
        name: "Scroll Alpha Testnet",
        chain: scroll,
        rpcUrl: "https://alpha-rpc.scroll.io/l2",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://blockscout.scroll.io"
    },
    filecoin: {
        chainId: 314,
        name: "Filecoin",
        chain: filecoin,
        rpcUrl: "https://api.node.glif.io/rpc/v1",
        nativeCurrency: {
            name: "Filecoin",
            symbol: "FIL",
            decimals: 18
        },
        blockExplorerUrl: "https://filfox.info/en"
    },
    taiko: {
        chainId: 167005,
        name: "Taiko (Alpha-3) Testnet",
        chain: taiko,
        rpcUrl: "https://rpc.a3.taiko.xyz",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://explorer.a3.taiko.xyz"
    },
    zksync: {
        chainId: 324,
        name: "zkSync Era",
        chain: zkSync,
        rpcUrl: "https://mainnet.era.zksync.io",
        nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18
        },
        blockExplorerUrl: "https://explorer.zksync.io"
    },
    canto: {
        chainId: 7700,
        name: "Canto",
        chain: canto,
        rpcUrl: "https://canto.slingshot.finance",
        nativeCurrency: {
            name: "CANTO",
            symbol: "CANTO",
            decimals: 18
        },
        blockExplorerUrl: "https://tuber.build"
    }
} as const;


export const getChainConfigs = (runtime: IAgentRuntime) => {
    return (
        (runtime.character.settings.chains?.evm as ChainConfig[]) ||
        DEFAULT_CHAIN_CONFIGS
    );
};

export class WalletProvider {
    private chainConfigs: Record<SupportedChain, ChainConfig>;
    private currentChain: SupportedChain = "ethereum";
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
            ethereum: createClients("ethereum"),
            base: createClients("base"),
            sepolia: createClients("sepolia"),
            bnbSmartChain: createClients("bnbSmartChain"),
            arbitrumOne: createClients("arbitrumOne"),
            avalancheCChain: createClients("avalancheCChain"),
            polygon: createClients("polygon"),
            optimism: createClients("optimism"),
            cronos: createClients("cronos"),
            gnosis: createClients("gnosis"),
            fantom: createClients("fantom"),
            klaytn: createClients("klaytn"),
            celo: createClients("celo"),
            moonbeam: createClients("moonbeam"),
            aurora: createClients("aurora"),
            harmony: createClients("harmony"),
            moonriver: createClients("moonriver"),
            arbitrumNova: createClients("arbitrumNova"),
            mantle: createClients("mantle"),
            linea: createClients("linea"),
            scroll: createClients("scroll"),
            filecoin: createClients("filecoin"),
            taiko: createClients("taiko"),
            zksync: createClients("zksync"),
            canto: createClients("canto")
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
