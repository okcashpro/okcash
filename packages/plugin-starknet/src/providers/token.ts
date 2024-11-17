import { settings } from "@ai16z/eliza";
import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import {
    DexScreenerData,
    DexScreenerPair,
    HolderData,
    ProcessedTokenData,
    TokenSecurityData,
    TokenTradeData,
    CalculatedBuyAmounts,
    Prices,
} from "../types/trustDB.ts";
import { WalletProvider, Item } from "./walletProvider.ts";
import { num } from "starknet";
import {
    analyzeHighSupplyHolders,
    evaluateTokenTrading,
    TokenMetrics,
} from "./utils.ts";
import { PROVIDER_CONFIG } from "../index.ts";
import { Cache } from "../utils/cache.ts";

export class TokenProvider {
    private cache: Cache;

    constructor(
        private tokenAddress: string,
        private walletProvider: WalletProvider
    ) {
        this.cache = new Cache();
    }

    // TODO: remove this
    private async fetchWithRetry(
        url: string,
        options: RequestInit = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        let lastError: Error;

        for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        Accept: "application/json",
                        "x-chain": "solana",
                        "X-API-KEY": settings.BIRDEYE_API_KEY || "",
                        ...options.headers,
                    },
                });

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
                lastError = error as Error;
                if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
                    const delay = PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i);
                    console.log(`Waiting ${delay}ms before retrying...`);
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

    // TODO: Update to Starknet
    async getTokensInWallet(runtime: IAgentRuntime): Promise<Item[]> {
        const walletInfo =
            await this.walletProvider.fetchPortfolioValue(runtime);
        const items = walletInfo.items;
        return items;
    }

    // check if the token symbol is in the wallet
    async getTokenFromWallet(runtime: IAgentRuntime, tokenSymbol: string) {
        try {
            const items = await this.getTokensInWallet(runtime);
            const token = items.find((item) => item.symbol === tokenSymbol);

            if (token) {
                return token.address;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error checking token in wallet:", error);
            return null;
        }
    }

    // TODO: Update to Starknet
    async fetchPrices(): Promise<Prices> {
        try {
            const cacheKey = "prices";
            const cachedData = this.cache.getCachedData<Prices>(cacheKey);
            if (cachedData) {
                console.log("Returning cached prices.");
                return cachedData;
            }
            const { SOL, BTC, ETH } = PROVIDER_CONFIG.TOKEN_ADDRESSES;
            const tokens = [SOL, BTC, ETH];
            const prices: Prices = {
                solana: { usd: "0" },
                bitcoin: { usd: "0" },
                ethereum: { usd: "0" },
            };

            for (const token of tokens) {
                const response = await this.fetchWithRetry(
                    `${PROVIDER_CONFIG.BIRDEYE_API}/defi/price?address=${token}`,
                    {
                        headers: {
                            "x-chain": "solana",
                        },
                    }
                );

                if (response?.data?.value) {
                    const price = response.data.value.toString();
                    prices[
                        token === SOL
                            ? "solana"
                            : token === BTC
                              ? "bitcoin"
                              : "ethereum"
                    ].usd = price;
                } else {
                    console.warn(`No price data available for token: ${token}`);
                }
            }
            this.cache.setCachedData(cacheKey, prices);
            return prices;
        } catch (error) {
            console.error("Error fetching prices:", error);
            throw error;
        }
    }

    // TODO: change to starknet
    async calculateBuyAmounts(): Promise<CalculatedBuyAmounts> {
        const dexScreenerData = await this.fetchDexScreenerData();
        const prices = await this.fetchPrices();
        const solPrice = num.toBigInt(prices.solana.usd);

        if (!dexScreenerData || dexScreenerData.pairs.length === 0) {
            return { none: 0, low: 0, medium: 0, high: 0 };
        }

        // Get the first pair
        const pair = dexScreenerData.pairs[0];
        const { liquidity, marketCap } = pair;
        if (!liquidity || !marketCap) {
            return { none: 0, low: 0, medium: 0, high: 0 };
        }

        if (liquidity.usd === 0) {
            return { none: 0, low: 0, medium: 0, high: 0 };
        }
        if (marketCap < 100000) {
            return { none: 0, low: 0, medium: 0, high: 0 };
        }

        // impact percentages based on liquidity
        const impactPercentages = {
            LOW: 0.01, // 1% of liquidity
            MEDIUM: 0.05, // 5% of liquidity
            HIGH: 0.1, // 10% of liquidity
        };

        // Calculate buy amounts in USD
        const lowBuyAmountUSD = liquidity.usd * impactPercentages.LOW;
        const mediumBuyAmountUSD = liquidity.usd * impactPercentages.MEDIUM;
        const highBuyAmountUSD = liquidity.usd * impactPercentages.HIGH;

        // Convert each buy amount to SOL
        const lowBuyAmountSOL = num.toBigInt(lowBuyAmountUSD) / solPrice;
        const mediumBuyAmountSOL = num.toBigInt(mediumBuyAmountUSD) / solPrice;
        const highBuyAmountSOL = num.toBigInt(highBuyAmountUSD) / solPrice;

        return {
            none: 0,
            low: Number(lowBuyAmountSOL),
            medium: Number(mediumBuyAmountSOL),
            high: Number(highBuyAmountSOL),
        };
    }

    // TODO: Update to Starknet
    async fetchTokenSecurity(): Promise<TokenSecurityData> {
        const cacheKey = `tokenSecurity_${this.tokenAddress}`;
        const cachedData =
            this.cache.getCachedData<TokenSecurityData>(cacheKey);
        if (cachedData) {
            console.log(
                `Returning cached token security data for ${this.tokenAddress}.`
            );
            return cachedData;
        }
        const url = `${PROVIDER_CONFIG.BIRDEYE_API}${PROVIDER_CONFIG.TOKEN_SECURITY_ENDPOINT}${this.tokenAddress}`;
        const data = await this.fetchWithRetry(url);

        if (!data?.success || !data?.data) {
            throw new Error("No token security data available");
        }

        const security: TokenSecurityData = {
            ownerBalance: data.data.ownerBalance,
            creatorBalance: data.data.creatorBalance,
            ownerPercentage: data.data.ownerPercentage,
            creatorPercentage: data.data.creatorPercentage,
            top10HolderBalance: data.data.top10HolderBalance,
            top10HolderPercent: data.data.top10HolderPercent,
        };
        this.cache.setCachedData(cacheKey, security);
        console.log(`Token security data cached for ${this.tokenAddress}.`);

        return security;
    }

    // TODO: Update to Starknet
    async fetchTokenTradeData(): Promise<TokenTradeData> {
        const cacheKey = `tokenTradeData_${this.tokenAddress}`;
        const cachedData = this.cache.getCachedData<TokenTradeData>(cacheKey);
        if (cachedData) {
            console.log(
                `Returning cached token trade data for ${this.tokenAddress}.`
            );
            return cachedData;
        }

        const url = `${PROVIDER_CONFIG.BIRDEYE_API}${PROVIDER_CONFIG.TOKEN_TRADE_DATA_ENDPOINT}${this.tokenAddress}`;
        const options = {
            method: "GET",
            headers: {
                accept: "application/json",
                "X-API-KEY": settings.BIRDEYE_API_KEY || "",
            },
        };

        const data = await fetch(url, options)
            .then((res) => res.json())
            .catch((err) => console.error(err));

        if (!data?.success || !data?.data) {
            throw new Error("No token trade data available");
        }

        const tradeData: TokenTradeData = {
            address: data.data.address,
            holder: data.data.holder,
            market: data.data.market,
            last_trade_unix_time: data.data.last_trade_unix_time,
            last_trade_human_time: data.data.last_trade_human_time,
            price: data.data.price,
            history_30m_price: data.data.history_30m_price,
            price_change_30m_percent: data.data.price_change_30m_percent,
            history_1h_price: data.data.history_1h_price,
            price_change_1h_percent: data.data.price_change_1h_percent,
            history_2h_price: data.data.history_2h_price,
            price_change_2h_percent: data.data.price_change_2h_percent,
            history_4h_price: data.data.history_4h_price,
            price_change_4h_percent: data.data.price_change_4h_percent,
            history_6h_price: data.data.history_6h_price,
            price_change_6h_percent: data.data.price_change_6h_percent,
            history_8h_price: data.data.history_8h_price,
            price_change_8h_percent: data.data.price_change_8h_percent,
            history_12h_price: data.data.history_12h_price,
            price_change_12h_percent: data.data.price_change_12h_percent,
            history_24h_price: data.data.history_24h_price,
            price_change_24h_percent: data.data.price_change_24h_percent,
            unique_wallet_30m: data.data.unique_wallet_30m,
            unique_wallet_history_30m: data.data.unique_wallet_history_30m,
            unique_wallet_30m_change_percent:
                data.data.unique_wallet_30m_change_percent,
            unique_wallet_1h: data.data.unique_wallet_1h,
            unique_wallet_history_1h: data.data.unique_wallet_history_1h,
            unique_wallet_1h_change_percent:
                data.data.unique_wallet_1h_change_percent,
            unique_wallet_2h: data.data.unique_wallet_2h,
            unique_wallet_history_2h: data.data.unique_wallet_history_2h,
            unique_wallet_2h_change_percent:
                data.data.unique_wallet_2h_change_percent,
            unique_wallet_4h: data.data.unique_wallet_4h,
            unique_wallet_history_4h: data.data.unique_wallet_history_4h,
            unique_wallet_4h_change_percent:
                data.data.unique_wallet_4h_change_percent,
            unique_wallet_8h: data.data.unique_wallet_8h,
            unique_wallet_history_8h: data.data.unique_wallet_history_8h,
            unique_wallet_8h_change_percent:
                data.data.unique_wallet_8h_change_percent,
            unique_wallet_24h: data.data.unique_wallet_24h,
            unique_wallet_history_24h: data.data.unique_wallet_history_24h,
            unique_wallet_24h_change_percent:
                data.data.unique_wallet_24h_change_percent,
            trade_30m: data.data.trade_30m,
            trade_history_30m: data.data.trade_history_30m,
            trade_30m_change_percent: data.data.trade_30m_change_percent,
            sell_30m: data.data.sell_30m,
            sell_history_30m: data.data.sell_history_30m,
            sell_30m_change_percent: data.data.sell_30m_change_percent,
            buy_30m: data.data.buy_30m,
            buy_history_30m: data.data.buy_history_30m,
            buy_30m_change_percent: data.data.buy_30m_change_percent,
            volume_30m: data.data.volume_30m,
            volume_30m_usd: data.data.volume_30m_usd,
            volume_history_30m: data.data.volume_history_30m,
            volume_history_30m_usd: data.data.volume_history_30m_usd,
            volume_30m_change_percent: data.data.volume_30m_change_percent,
            volume_buy_30m: data.data.volume_buy_30m,
            volume_buy_30m_usd: data.data.volume_buy_30m_usd,
            volume_buy_history_30m: data.data.volume_buy_history_30m,
            volume_buy_history_30m_usd: data.data.volume_buy_history_30m_usd,
            volume_buy_30m_change_percent:
                data.data.volume_buy_30m_change_percent,
            volume_sell_30m: data.data.volume_sell_30m,
            volume_sell_30m_usd: data.data.volume_sell_30m_usd,
            volume_sell_history_30m: data.data.volume_sell_history_30m,
            volume_sell_history_30m_usd: data.data.volume_sell_history_30m_usd,
            volume_sell_30m_change_percent:
                data.data.volume_sell_30m_change_percent,
            trade_1h: data.data.trade_1h,
            trade_history_1h: data.data.trade_history_1h,
            trade_1h_change_percent: data.data.trade_1h_change_percent,
            sell_1h: data.data.sell_1h,
            sell_history_1h: data.data.sell_history_1h,
            sell_1h_change_percent: data.data.sell_1h_change_percent,
            buy_1h: data.data.buy_1h,
            buy_history_1h: data.data.buy_history_1h,
            buy_1h_change_percent: data.data.buy_1h_change_percent,
            volume_1h: data.data.volume_1h,
            volume_1h_usd: data.data.volume_1h_usd,
            volume_history_1h: data.data.volume_history_1h,
            volume_history_1h_usd: data.data.volume_history_1h_usd,
            volume_1h_change_percent: data.data.volume_1h_change_percent,
            volume_buy_1h: data.data.volume_buy_1h,
            volume_buy_1h_usd: data.data.volume_buy_1h_usd,
            volume_buy_history_1h: data.data.volume_buy_history_1h,
            volume_buy_history_1h_usd: data.data.volume_buy_history_1h_usd,
            volume_buy_1h_change_percent:
                data.data.volume_buy_1h_change_percent,
            volume_sell_1h: data.data.volume_sell_1h,
            volume_sell_1h_usd: data.data.volume_sell_1h_usd,
            volume_sell_history_1h: data.data.volume_sell_history_1h,
            volume_sell_history_1h_usd: data.data.volume_sell_history_1h_usd,
            volume_sell_1h_change_percent:
                data.data.volume_sell_1h_change_percent,
            trade_2h: data.data.trade_2h,
            trade_history_2h: data.data.trade_history_2h,
            trade_2h_change_percent: data.data.trade_2h_change_percent,
            sell_2h: data.data.sell_2h,
            sell_history_2h: data.data.sell_history_2h,
            sell_2h_change_percent: data.data.sell_2h_change_percent,
            buy_2h: data.data.buy_2h,
            buy_history_2h: data.data.buy_history_2h,
            buy_2h_change_percent: data.data.buy_2h_change_percent,
            volume_2h: data.data.volume_2h,
            volume_2h_usd: data.data.volume_2h_usd,
            volume_history_2h: data.data.volume_history_2h,
            volume_history_2h_usd: data.data.volume_history_2h_usd,
            volume_2h_change_percent: data.data.volume_2h_change_percent,
            volume_buy_2h: data.data.volume_buy_2h,
            volume_buy_2h_usd: data.data.volume_buy_2h_usd,
            volume_buy_history_2h: data.data.volume_buy_history_2h,
            volume_buy_history_2h_usd: data.data.volume_buy_history_2h_usd,
            volume_buy_2h_change_percent:
                data.data.volume_buy_2h_change_percent,
            volume_sell_2h: data.data.volume_sell_2h,
            volume_sell_2h_usd: data.data.volume_sell_2h_usd,
            volume_sell_history_2h: data.data.volume_sell_history_2h,
            volume_sell_history_2h_usd: data.data.volume_sell_history_2h_usd,
            volume_sell_2h_change_percent:
                data.data.volume_sell_2h_change_percent,
            trade_4h: data.data.trade_4h,
            trade_history_4h: data.data.trade_history_4h,
            trade_4h_change_percent: data.data.trade_4h_change_percent,
            sell_4h: data.data.sell_4h,
            sell_history_4h: data.data.sell_history_4h,
            sell_4h_change_percent: data.data.sell_4h_change_percent,
            buy_4h: data.data.buy_4h,
            buy_history_4h: data.data.buy_history_4h,
            buy_4h_change_percent: data.data.buy_4h_change_percent,
            volume_4h: data.data.volume_4h,
            volume_4h_usd: data.data.volume_4h_usd,
            volume_history_4h: data.data.volume_history_4h,
            volume_history_4h_usd: data.data.volume_history_4h_usd,
            volume_4h_change_percent: data.data.volume_4h_change_percent,
            volume_buy_4h: data.data.volume_buy_4h,
            volume_buy_4h_usd: data.data.volume_buy_4h_usd,
            volume_buy_history_4h: data.data.volume_buy_history_4h,
            volume_buy_history_4h_usd: data.data.volume_buy_history_4h_usd,
            volume_buy_4h_change_percent:
                data.data.volume_buy_4h_change_percent,
            volume_sell_4h: data.data.volume_sell_4h,
            volume_sell_4h_usd: data.data.volume_sell_4h_usd,
            volume_sell_history_4h: data.data.volume_sell_history_4h,
            volume_sell_history_4h_usd: data.data.volume_sell_history_4h_usd,
            volume_sell_4h_change_percent:
                data.data.volume_sell_4h_change_percent,
            trade_8h: data.data.trade_8h,
            trade_history_8h: data.data.trade_history_8h,
            trade_8h_change_percent: data.data.trade_8h_change_percent,
            sell_8h: data.data.sell_8h,
            sell_history_8h: data.data.sell_history_8h,
            sell_8h_change_percent: data.data.sell_8h_change_percent,
            buy_8h: data.data.buy_8h,
            buy_history_8h: data.data.buy_history_8h,
            buy_8h_change_percent: data.data.buy_8h_change_percent,
            volume_8h: data.data.volume_8h,
            volume_8h_usd: data.data.volume_8h_usd,
            volume_history_8h: data.data.volume_history_8h,
            volume_history_8h_usd: data.data.volume_history_8h_usd,
            volume_8h_change_percent: data.data.volume_8h_change_percent,
            volume_buy_8h: data.data.volume_buy_8h,
            volume_buy_8h_usd: data.data.volume_buy_8h_usd,
            volume_buy_history_8h: data.data.volume_buy_history_8h,
            volume_buy_history_8h_usd: data.data.volume_buy_history_8h_usd,
            volume_buy_8h_change_percent:
                data.data.volume_buy_8h_change_percent,
            volume_sell_8h: data.data.volume_sell_8h,
            volume_sell_8h_usd: data.data.volume_sell_8h_usd,
            volume_sell_history_8h: data.data.volume_sell_history_8h,
            volume_sell_history_8h_usd: data.data.volume_sell_history_8h_usd,
            volume_sell_8h_change_percent:
                data.data.volume_sell_8h_change_percent,
            trade_24h: data.data.trade_24h,
            trade_history_24h: data.data.trade_history_24h,
            trade_24h_change_percent: data.data.trade_24h_change_percent,
            sell_24h: data.data.sell_24h,
            sell_history_24h: data.data.sell_history_24h,
            sell_24h_change_percent: data.data.sell_24h_change_percent,
            buy_24h: data.data.buy_24h,
            buy_history_24h: data.data.buy_history_24h,
            buy_24h_change_percent: data.data.buy_24h_change_percent,
            volume_24h: data.data.volume_24h,
            volume_24h_usd: data.data.volume_24h_usd,
            volume_history_24h: data.data.volume_history_24h,
            volume_history_24h_usd: data.data.volume_history_24h_usd,
            volume_24h_change_percent: data.data.volume_24h_change_percent,
            volume_buy_24h: data.data.volume_buy_24h,
            volume_buy_24h_usd: data.data.volume_buy_24h_usd,
            volume_buy_history_24h: data.data.volume_buy_history_24h,
            volume_buy_history_24h_usd: data.data.volume_buy_history_24h_usd,
            volume_buy_24h_change_percent:
                data.data.volume_buy_24h_change_percent,
            volume_sell_24h: data.data.volume_sell_24h,
            volume_sell_24h_usd: data.data.volume_sell_24h_usd,
            volume_sell_history_24h: data.data.volume_sell_history_24h,
            volume_sell_history_24h_usd: data.data.volume_sell_history_24h_usd,
            volume_sell_24h_change_percent:
                data.data.volume_sell_24h_change_percent,
        };
        this.cache.setCachedData(cacheKey, tradeData);
        return tradeData;
    }

    async fetchDexScreenerData(): Promise<DexScreenerData> {
        const cacheKey = `dexScreenerData_${this.tokenAddress}`;
        const cachedData = this.cache.getCachedData<DexScreenerData>(cacheKey);
        if (cachedData) {
            console.log("Returning cached DexScreener data.");
            return cachedData;
        }

        const url = `https://api.dexscreener.com/latest/dex/search?q=${this.tokenAddress}`;
        try {
            console.log(
                `Fetching DexScreener data for token: ${this.tokenAddress}`
            );
            const data = await fetch(url)
                .then((res) => res.json())
                .catch((err) => {
                    console.error(err);
                });

            if (!data || !data.pairs) {
                throw new Error("No DexScreener data available");
            }

            const dexData: DexScreenerData = {
                schemaVersion: data.schemaVersion,
                pairs: data.pairs,
            };

            // Cache the result
            this.cache.setCachedData(cacheKey, dexData);

            return dexData;
        } catch (error) {
            console.error(`Error fetching DexScreener data:`, error);
            return {
                schemaVersion: "1.0.0",
                pairs: [],
            };
        }
    }

    async searchDexScreenerData(
        symbol: string
    ): Promise<DexScreenerPair | null> {
        const cacheKey = `dexScreenerData_search_${symbol}`;
        const cachedData = this.cache.getCachedData<DexScreenerData>(cacheKey);
        if (cachedData) {
            console.log("Returning cached search DexScreener data.");
            return this.getHighestLiquidityPair(cachedData);
        }

        const url = `https://api.dexscreener.com/latest/dex/search?q=${symbol}`;
        try {
            console.log(`Fetching DexScreener data for symbol: ${symbol}`);
            const data = await fetch(url)
                .then((res) => res.json())
                .catch((err) => {
                    console.error(err);
                    return null;
                });

            if (!data || !data.pairs || data.pairs.length === 0) {
                throw new Error("No DexScreener data available");
            }

            const dexData: DexScreenerData = {
                schemaVersion: data.schemaVersion,
                pairs: data.pairs,
            };

            // Cache the result
            this.cache.setCachedData(cacheKey, dexData);

            // Return the pair with the highest liquidity and market cap
            return this.getHighestLiquidityPair(dexData);
        } catch (error) {
            console.error(`Error fetching DexScreener data:`, error);
            return null;
        }
    }

    getHighestLiquidityPair(dexData: DexScreenerData): DexScreenerPair | null {
        if (dexData.pairs.length === 0) {
            return null;
        }

        // Sort pairs by both liquidity and market cap to get the highest one
        return dexData.pairs.reduce((highestPair, currentPair) => {
            const currentLiquidity = currentPair.liquidity.usd;
            const currentMarketCap = currentPair.marketCap;
            const highestLiquidity = highestPair.liquidity.usd;
            const highestMarketCap = highestPair.marketCap;

            if (
                currentLiquidity > highestLiquidity ||
                (currentLiquidity === highestLiquidity &&
                    currentMarketCap > highestMarketCap)
            ) {
                return currentPair;
            }
            return highestPair;
        });
    }

    async analyzeHolderDistribution(
        tradeData: TokenTradeData
    ): Promise<string> {
        // Define the time intervals to consider (e.g., 30m, 1h, 2h)
        const intervals = [
            {
                period: "30m",
                change: tradeData.unique_wallet_30m_change_percent,
            },
            { period: "1h", change: tradeData.unique_wallet_1h_change_percent },
            { period: "2h", change: tradeData.unique_wallet_2h_change_percent },
            { period: "4h", change: tradeData.unique_wallet_4h_change_percent },
            { period: "8h", change: tradeData.unique_wallet_8h_change_percent },
            {
                period: "24h",
                change: tradeData.unique_wallet_24h_change_percent,
            },
        ];

        // Calculate the average change percentage
        const validChanges = intervals
            .map((interval) => interval.change)
            .filter(
                (change) => change !== null && change !== undefined
            ) as number[];

        if (validChanges.length === 0) {
            return "stable";
        }

        const averageChange =
            validChanges.reduce((acc, curr) => acc + curr, 0) /
            validChanges.length;

        const increaseThreshold = 10; // e.g., average change > 10%
        const decreaseThreshold = -10; // e.g., average change < -10%

        if (averageChange > increaseThreshold) {
            return "increasing";
        } else if (averageChange < decreaseThreshold) {
            return "decreasing";
        } else {
            return "stable";
        }
    }

    // TODO: Update to Starknet
    async fetchHolderList(): Promise<HolderData[]> {
        const cacheKey = `holderList_${this.tokenAddress}`;
        const cachedData = this.cache.getCachedData<HolderData[]>(cacheKey);
        if (cachedData) {
            console.log("Returning cached holder list.");
            return cachedData;
        }

        const allHoldersMap = new Map<string, number>();
        let page = 1;
        const limit = 1000;
        let cursor;
        //HELIOUS_API_KEY needs to be added
        const url = `https://mainnet.helius-rpc.com/?api-key=${settings.HELIUS_API_KEY || ""}`;
        console.log({ url });

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const params = {
                    limit: limit,
                    displayOptions: {},
                    mint: this.tokenAddress,
                    cursor: cursor,
                };
                if (cursor != undefined) {
                    params.cursor = cursor;
                }
                console.log(`Fetching holders - Page ${page}`);
                if (page > 2) {
                    break;
                }
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: "helius-test",
                        method: "getTokenAccounts",
                        params: params,
                    }),
                });

                const data = await response.json();

                if (
                    !data ||
                    !data.result ||
                    !data.result.token_accounts ||
                    data.result.token_accounts.length === 0
                ) {
                    console.log(
                        `No more holders found. Total pages fetched: ${page - 1}`
                    );
                    break;
                }

                console.log(
                    `Processing ${data.result.token_accounts.length} holders from page ${page}`
                );

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.result.token_accounts.forEach((account: any) => {
                    const owner = account.owner;
                    const balance = parseFloat(account.amount);

                    if (allHoldersMap.has(owner)) {
                        allHoldersMap.set(
                            owner,
                            allHoldersMap.get(owner)! + balance
                        );
                    } else {
                        allHoldersMap.set(owner, balance);
                    }
                });
                cursor = data.result.cursor;
                page++;
            }

            const holders: HolderData[] = Array.from(
                allHoldersMap.entries()
            ).map(([address, balance]) => ({
                address,
                balance: balance.toString(),
            }));

            console.log(`Total unique holders fetched: ${holders.length}`);

            // Cache the result
            this.cache.setCachedData(cacheKey, holders);

            return holders;
        } catch (error) {
            console.error("Error fetching holder list from Helius:", error);
            throw new Error("Failed to fetch holder list from Helius.");
        }
    }

    async filterHighValueHolders(
        tradeData: TokenTradeData
    ): Promise<Array<{ holderAddress: string; balanceUsd: string }>> {
        const holdersData = await this.fetchHolderList();

        const tokenPriceUsd = num.toBigInt(tradeData.price);

        const highValueHolders = holdersData
            .filter((holder) => {
                const balanceUsd = num.toBigInt(holder.balance) * tokenPriceUsd;
                return balanceUsd > 5;
            })
            .map((holder) => ({
                holderAddress: holder.address,
                balanceUsd: (
                    num.toBigInt(holder.balance) * tokenPriceUsd
                ).toString(),
            }));

        return highValueHolders;
    }

    async checkRecentTrades(volume24hUsd: bigint): Promise<boolean> {
        return volume24hUsd > 0;
    }

    async countHighSupplyHolders(
        securityData: TokenSecurityData
    ): Promise<number> {
        try {
            const holders = await this.fetchHolderList();
            const result = analyzeHighSupplyHolders({
                holders,
                ownerBalance: securityData.ownerBalance,
                creatorBalance: securityData.creatorBalance,
            });

            return result.count;
        } catch (error) {
            console.error("Error counting high supply holders:", error);
            return 0;
        }
    }

    async getProcessedTokenData(): Promise<ProcessedTokenData> {
        try {
            console.log(
                `Fetching security data for token: ${this.tokenAddress}`
            );
            const security = await this.fetchTokenSecurity();

            console.log(`Fetching trade data for token: ${this.tokenAddress}`);
            const tradeData = await this.fetchTokenTradeData();

            console.log(
                `Fetching DexScreener data for token: ${this.tokenAddress}`
            );
            const dexData = await this.fetchDexScreenerData();

            console.log(
                `Analyzing holder distribution for token: ${this.tokenAddress}`
            );
            const holderDistributionTrend =
                await this.analyzeHolderDistribution(tradeData);

            console.log(
                `Filtering high-value holders for token: ${this.tokenAddress}`
            );
            const highValueHolders =
                await this.filterHighValueHolders(tradeData);

            console.log(
                `Checking recent trades for token: ${this.tokenAddress}`
            );
            const recentTrades = await this.checkRecentTrades(
                num.toBigInt(tradeData.volume_24h_usd)
            );

            console.log(
                `Counting high-supply holders for token: ${this.tokenAddress}`
            );
            const highSupplyHoldersCount =
                await this.countHighSupplyHolders(security);

            console.log(
                `Determining DexScreener listing status for token: ${this.tokenAddress}`
            );
            const isDexScreenerListed = dexData.pairs.length > 0;
            const isDexScreenerPaid = dexData.pairs.some(
                (pair) => pair.boosts && pair.boosts.active > 0
            );

            const processedData: ProcessedTokenData = {
                security,
                tradeData,
                holderDistributionTrend,
                highValueHolders,
                recentTrades,
                highSupplyHoldersCount,
                dexScreenerData: dexData,
                isDexScreenerListed,
                isDexScreenerPaid,
            };

            // console.log("Processed token data:", processedData);
            return processedData;
        } catch (error) {
            console.error("Error processing token data:", error);
            throw error;
        }
    }

    async shouldTradeToken(): Promise<boolean> {
        try {
            const tokenData = await this.getProcessedTokenData();
            const { tradeData, security, dexScreenerData } = tokenData;
            const { ownerBalance, creatorBalance } = security;
            const { liquidity, marketCap } = dexScreenerData.pairs[0];

            const totalSupply =
                num.toBigInt(ownerBalance) + num.toBigInt(creatorBalance);

            const metrics: TokenMetrics = {
                liquidityUsd: num.toBigInt(liquidity.usd),
                marketCapUsd: num.toBigInt(marketCap),
                totalSupply,
                ownerPercentage:
                    Number(num.toBigInt(ownerBalance)) / Number(totalSupply),
                creatorPercentage:
                    Number(num.toBigInt(creatorBalance)) / Number(totalSupply),
                top10HolderPercent:
                    Number(num.toBigInt(tradeData.volume_24h_usd)) /
                    Number(totalSupply),
                priceChange24hPercent: Number(
                    num.toBigInt(tradeData.price_change_24h_percent)
                ),
                priceChange12hPercent: Number(
                    num.toBigInt(tradeData.price_change_12h_percent)
                ),
                uniqueWallet24h: tradeData.unique_wallet_24h,
                volume24hUsd: num.toBigInt(tradeData.volume_24h_usd),
            };

            const { shouldTrade } = evaluateTokenTrading(metrics);
            return shouldTrade;
        } catch (error) {
            console.error("Error processing token data:", error);
            throw error;
        }
    }

    formatTokenData(data: ProcessedTokenData): string {
        let output = `**Token Security and Trade Report**\n`;
        output += `Token Address: ${this.tokenAddress}\n\n`;

        // Security Data
        output += `**Ownership Distribution:**\n`;
        output += `- Owner Balance: ${data.security.ownerBalance}\n`;
        output += `- Creator Balance: ${data.security.creatorBalance}\n`;
        output += `- Owner Percentage: ${data.security.ownerPercentage}%\n`;
        output += `- Creator Percentage: ${data.security.creatorPercentage}%\n`;
        output += `- Top 10 Holders Balance: ${data.security.top10HolderBalance}\n`;
        output += `- Top 10 Holders Percentage: ${data.security.top10HolderPercent}%\n\n`;

        // Trade Data
        output += `**Trade Data:**\n`;
        output += `- Holders: ${data.tradeData.holder}\n`;
        output += `- Unique Wallets (24h): ${data.tradeData.unique_wallet_24h}\n`;
        output += `- Price Change (24h): ${data.tradeData.price_change_24h_percent}%\n`;
        output += `- Price Change (12h): ${data.tradeData.price_change_12h_percent}%\n`;
        output += `- Volume (24h USD): $${num
            .toBigInt(data.tradeData.volume_24h_usd)
            .toString()}\n`;
        output += `- Current Price: $${num.toBigInt(data.tradeData.price).toString()}\n\n`;

        // Holder Distribution Trend
        output += `**Holder Distribution Trend:** ${data.holderDistributionTrend}\n\n`;

        // High-Value Holders
        output += `**High-Value Holders (>$5 USD):**\n`;
        if (data.highValueHolders.length === 0) {
            output += `- No high-value holders found or data not available.\n`;
        } else {
            data.highValueHolders.forEach((holder) => {
                output += `- ${holder.holderAddress}: $${holder.balanceUsd}\n`;
            });
        }
        output += `\n`;

        // Recent Trades
        output += `**Recent Trades (Last 24h):** ${data.recentTrades ? "Yes" : "No"}\n\n`;

        // High-Supply Holders
        output += `**Holders with >2% Supply:** ${data.highSupplyHoldersCount}\n\n`;

        // DexScreener Status
        output += `**DexScreener Listing:** ${data.isDexScreenerListed ? "Yes" : "No"}\n`;
        if (data.isDexScreenerListed) {
            output += `- Listing Type: ${data.isDexScreenerPaid ? "Paid" : "Free"}\n`;
            output += `- Number of DexPairs: ${data.dexScreenerData.pairs.length}\n\n`;
            output += `**DexScreener Pairs:**\n`;
            data.dexScreenerData.pairs.forEach((pair, index) => {
                output += `\n**Pair ${index + 1}:**\n`;
                output += `- DEX: ${pair.dexId}\n`;
                output += `- URL: ${pair.url}\n`;
                output += `- Price USD: $${num.toBigInt(pair.priceUsd).toString()}\n`;
                output += `- Volume (24h USD): $${num.toBigInt(pair.volume.h24).toString()}\n`;
                output += `- Boosts Active: ${pair.boosts && pair.boosts.active}\n`;
                output += `- Liquidity USD: $${num.toBigInt(pair.liquidity.usd).toString()}\n`;
            });
        }
        output += `\n`;

        console.log("Formatted token data:", output);
        return output;
    }

    async getFormattedTokenReport(): Promise<string> {
        try {
            console.log("Generating formatted token report...");
            const processedData = await this.getProcessedTokenData();
            return this.formatTokenData(processedData);
        } catch (error) {
            console.error("Error generating token report:", error);
            return "Unable to fetch token information. Please try again later.";
        }
    }
}

// TODO: Check

const tokenProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        tokenAddress?: string
    ): Promise<string> => {
        try {
            const walletProvider = new WalletProvider(runtime);
            const provider = new TokenProvider(tokenAddress, walletProvider);

            return provider.getFormattedTokenReport();
        } catch (error) {
            console.error("Error fetching token data:", error);
            return "Unable to fetch token information. Please try again later.";
        }
    },
};

export { tokenProvider };
