import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@ai16z/eliza";

import { fetchWithRetry, getStarknetAccount } from "../utils";
import { ERC20Token } from "../utils/ERC20Token";

const CONFIG = {
    // Coingecko IDs src:
    // https://api.coingecko.com/api/v3/coins/list
    // https://docs.google.com/spreadsheets/d/1wTTuxXt8n9q7C4NDXqQpI3wpKu1_5bGVmP9Xz0XGSyU/edit?gid=0#gid=0
    PORTFOLIO_TOKENS: {
        BROTHER: {
            address:
                "0x3b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee",
            coingeckoId: "starknet-brother",
            decimals: 18,
        },
        CASH: {
            address:
                "0x0498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada",
            coingeckoId: "opus-cash",
            decimals: 18,
        },
        ETH: {
            address:
                "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
            coingeckoId: "ethereum",
            decimals: 18,
        },
        LORDS: {
            address:
                "0x124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
            coingeckoId: "lords",
            decimals: 18,
        },
        STRK: {
            address:
                "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
            coingeckoId: "starknet",
            decimals: 18,
        },
        USDC: {
            address:
                "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
            coingeckoId: "usd-coin",
            decimals: 6,
        },
        USDT: {
            address:
                "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
            coingeckoId: "tether",
            decimals: 6,
        },
        WBTC: {
            address:
                "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
            coingeckoId: "bitcoin",
            decimals: 8,
        },
    },
};

type CoingeckoPrices = {
    [cryptoName: string]: { usd: number };
};

type TokenBalances = {
    [tokenAddress: string]: BigInt;
};

export class WalletProvider {
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    async getWalletPortfolio(): Promise<TokenBalances> {
        const cacheKey = `walletPortfolio-${this.runtime.agentId}`;
        const cachedValues = await this.runtime.cacheManager.get<TokenBalances>(
            cacheKey
        );
        if (cachedValues) {
            elizaLogger.debug("Using cached data for getWalletPortfolio()");
            return cachedValues;
        }

        const starknetAccount = getStarknetAccount(this.runtime);
        const balances: TokenBalances = {};

        // reading balances sequentially to prevent API issues
        for (const token of Object.values(CONFIG.PORTFOLIO_TOKENS)) {
            const erc20 = new ERC20Token(token.address, starknetAccount);
            const balance = await erc20.balanceOf(starknetAccount.address);
            balances[token.address] = balance;
        }

        await this.runtime.cacheManager.set(cacheKey, balances, {
            expires: Date.now() + 180 * 60 * 1000, // 3 hours cache
        });

        return balances;
    }

    async getTokenUsdValues(): Promise<CoingeckoPrices> {
        const cacheKey = "tokenUsdValues";
        const cachedValues =
            await this.runtime.cacheManager.get<CoingeckoPrices>(cacheKey);
        if (cachedValues) {
            elizaLogger.debug("Using cached data for getTokenUsdValues()");
            return cachedValues;
        }

        const coingeckoIds = Object.values(CONFIG.PORTFOLIO_TOKENS)
            .map((token) => token.coingeckoId)
            .join(",");

        const coingeckoPrices = await fetchWithRetry<CoingeckoPrices>(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`
        );

        await this.runtime.cacheManager.set(cacheKey, coingeckoPrices, {
            expires: Date.now() + 30 * 60 * 1000, // 30 minutes cache
        });

        return coingeckoPrices;
    }
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string> => {
        const provider = new WalletProvider(runtime);
        let walletPortfolio: TokenBalances = null;
        let tokenUsdValues: CoingeckoPrices = null;

        try {
            walletPortfolio = await provider.getWalletPortfolio();
            tokenUsdValues = await provider.getTokenUsdValues();
        } catch (error) {
            elizaLogger.error("Error in walletProvider.get():", error);
            return "Unable to fetch wallet portfolio. Please try again later.";
        }

        const rows = Object.entries(CONFIG.PORTFOLIO_TOKENS)
            .map(([symbol, token]) => {
                const rawBalance = walletPortfolio[token.address];
                if (rawBalance === undefined) return null;

                const decimalBalance =
                    Number(rawBalance) / Math.pow(10, token.decimals);
                const price = tokenUsdValues[token.coingeckoId]?.usd ?? 0;
                const usdValue = decimalBalance * price;

                if (decimalBalance === 0 && usdValue === 0) return null;

                return `${symbol.padEnd(9)}| ${decimalBalance
                    .toFixed(18)
                    .replace(/\.?0+$/, "")
                    .padEnd(20)}| ${usdValue.toFixed(2)}`;
            })
            .filter((row): row is string => row !== null);

        const header = "symbol   | balance             | USD value";
        const separator = "==================================================";
        return [header, separator, ...rows].join("\n");
    },
};

export { walletProvider };
