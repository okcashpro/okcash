import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";

// Provider configuration
const PROVIDER_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
};

interface WalletPortfolio {
    totalUsd: string;
    totalApt?: string;
}

interface Prices {
    apt: { usd: string };
}

export class WalletProvider {
    private cache: NodeCache;

    constructor(
        private aptosClient: Aptos,
        private address: string
    ) {
        this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    }

    private async fetchAptPriceWithRetry() {
        let lastError: Error;

        for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
            try {
                const cellanaAptUsdcPoolAddr =
                    "0x234f0be57d6acfb2f0f19c17053617311a8d03c9ce358bdf9cd5c460e4a02b7c";
                const response = await fetch(
                    `https://api.dexscreener.com/latest/dex/pairs/aptos/${cellanaAptUsdcPoolAddr}`
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `HTTP error! status: ${response.status}, message: ${errorText}`
                    );
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
                    const delay = PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        console.error(
            "All attempts failed. Throwing the last error:",
            lastError
        );
        throw lastError;
    }

    async fetchPortfolioValue(): Promise<WalletPortfolio> {
        try {
            const cacheKey = `portfolio-${this.address}`;
            const cachedValue = this.cache.get<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue");
                return cachedValue;
            }
            console.log("Cache miss for fetchPortfolioValue");

            const aptPrice = await this.fetchAptPrice().catch((error) => {
                console.error("Error fetching APT price:", error);
                throw error;
            });
            const aptAmount = await this.aptosClient
                .getAccountAPTAmount({
                    accountAddress: this.address,
                })
                .catch((error) => {
                    console.error("Error fetching APT amount:", error);
                    throw error;
                });

            const totalUsd = new BigNumber(aptAmount).times(aptPrice.apt.usd);

            const portfolio = {
                totalUsd: totalUsd.toString(),
                totalApt: aptAmount.toString(),
            };
            this.cache.set(cacheKey, portfolio);
            return portfolio;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    async fetchAptPrice(): Promise<Prices> {
        try {
            const cacheKey = "prices";
            const cachedValue = this.cache.get<Prices>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPrices");
                return cachedValue;
            }
            console.log("Cache miss for fetchPrices");

            const aptPriceData = await this.fetchAptPriceWithRetry().catch(
                (error) => {
                    console.error("Error fetching APT price:", error);
                    throw error;
                }
            );
            const prices: Prices = {
                apt: { usd: aptPriceData.pair.priceUsd },
            };
            this.cache.set(cacheKey, prices);
            return prices;
        } catch (error) {
            console.error("Error fetching prices:", error);
            throw error;
        }
    }

    formatPortfolio(runtime, portfolio: WalletPortfolio): string {
        let output = `${runtime.character.description}\n`;
        output += `Wallet Address: ${this.address}\n\n`;

        const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
        const totalAptFormatted = portfolio.totalApt;

        output += `Total Value: $${totalUsdFormatted} (${totalAptFormatted} APT)\n\n`;

        return output;
    }

    async getFormattedPortfolio(runtime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue();
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        const privateKey = runtime.getSetting("APTOS_PRIVATE_KEY");
        const aptosAccount = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(
                PrivateKey.formatPrivateKey(
                    privateKey,
                    PrivateKeyVariants.Ed25519
                )
            ),
        });
        const network = runtime.getSetting("APTOS_NETWORK") as Network;

        try {
            const aptosClient = new Aptos(
                new AptosConfig({
                    network,
                })
            );
            const provider = new WalletProvider(
                aptosClient,
                aptosAccount.accountAddress.toStringLong()
            );
            return await provider.getFormattedPortfolio(runtime);
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
