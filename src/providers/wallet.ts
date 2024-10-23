import { Connection, PublicKey } from "@solana/web3.js";
import fetch from "cross-fetch";
import { IAgentRuntime, Memory, Provider, State } from "../core/types";
import settings from "../core/settings.ts";
import BigNumber from "bignumber.js";

// Bot's wallet configuration
const BOT_WALLET = {
  publicKey: settings.WALLET_PUBLIC_KEY,
  description: "{{userName}}'s Wallet"
};

console.log("settings.BIRDEYE_API_KEY", settings.BIRDEYE_API_KEY);

// Provider configuration
const PROVIDER_CONFIG = {
  BIRDEYE_API: 'https://public-api.birdeye.so',
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  DEFAULT_RPC: 'https://api.mainnet-beta.solana.com',
  TOKEN_ADDRESSES: {
    SOL: 'So11111111111111111111111111111111111111112',
    BTC: 'qfnqNqs3nCAHjnyCgLRDbBtq4p2MtHZxw8YjSyYhPoL',
    ETH: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'
  }
};

interface Item {
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  uiAmount: string;
  priceUsd: string;
  valueUsd: string;
  valueSol?: string;
}

interface WalletPortfolio {
  totalUsd: string;
  totalSol?: string;
  items: Array<Item>;
}

interface BirdEyePriceData {
  data: {
    [key: string]: {
      price: number;
      priceChange24h: number;
    };
  };
}

interface Prices {
  solana: { usd: string };
  bitcoin: { usd: string };
  ethereum: { usd: string };
}

class WalletProvider {
  constructor(
    private connection: Connection,
    private walletPublicKey: PublicKey
  ) {}

  private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<any> {
    let lastError: Error;

    for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
      try {
        console.log(`Attempt ${i + 1}: Fetching data from ${url}`);
        console.log("settings.BIRDEYE_API_KEY", settings.BIRDEYE_API_KEY);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': settings.BIRDEYE_API_KEY || '',
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Attempt ${i + 1}: Data fetched successfully`, data);
        return data;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
          const delay = PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i);
          console.log(`Waiting ${delay}ms before retrying...`);
          await new Promise(resolve => 
            setTimeout(resolve, delay)
          );
          continue;
        }
      }
    }
    
    console.error("All attempts failed. Throwing the last error:", lastError);
    throw lastError;
  }

  async fetchPortfolioValue(): Promise<WalletPortfolio> {
    try {
      console.log(`Fetching portfolio value for wallet: ${this.walletPublicKey.toBase58()}`);
      const walletData = await this.fetchWithRetry(
        `${PROVIDER_CONFIG.BIRDEYE_API}/v1/wallet/token_list?wallet=${this.walletPublicKey.toBase58()}`
      );

      if (!walletData?.success || !walletData?.data) {
        console.error("No portfolio data available", walletData);
        throw new Error('No portfolio data available');
      }

      const data = walletData.data;
      const totalUsd = new BigNumber(data.totalUsd.toString());
      const prices = await this.fetchPrices();
      const solPriceInUSD = new BigNumber(prices.solana.usd.toString());

      const items = data.items.map((item: any) => ({
        ...item,
        valueSol: new BigNumber(item.valueUsd || 0)
          .div(solPriceInUSD)
          .toFixed(6),
        name: item.name || "Unknown",
        symbol: item.symbol || "Unknown",
        priceUsd: item.priceUsd || "0",
        valueUsd: item.valueUsd || "0"
      }));

      const totalSol = totalUsd.div(solPriceInUSD);
      
      console.log("Fetched portfolio value:", {
        totalUsd: totalUsd.toString(),
        totalSol: totalSol.toFixed(6),
        items: items.length
      });
      
      return {
        totalUsd: totalUsd.toString(),
        totalSol: totalSol.toFixed(6),
        items: items.sort((a, b) => 
          new BigNumber(b.valueUsd).minus(new BigNumber(a.valueUsd)).toNumber()
        )
      };
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  async fetchPrices(): Promise<Prices> {
    try {
      const { SOL, BTC, ETH } = PROVIDER_CONFIG.TOKEN_ADDRESSES;
      const tokens = [SOL, BTC, ETH];
      const prices: Prices = {
        solana: { usd: "0" },
        bitcoin: { usd: "0" },
        ethereum: { usd: "0" },
      };
      
      console.log("Fetching prices for tokens:", tokens);

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
          console.log(`Fetched price for ${token}:`, price);
          prices[token === SOL ? "solana" : token === BTC ? "bitcoin" : "ethereum"].usd = price;
        } else {
          console.warn(`No price data available for token: ${token}`);
        }
      }

      console.log("Fetched prices:", prices);
      return prices;
    } catch (error) {
      console.error("Error fetching prices:", error);
      throw error;
    }
  }

  formatPortfolio(portfolio: WalletPortfolio, prices: Prices): string {
    let output = `${BOT_WALLET.description}\n`;
    output += `Wallet Address: ${this.walletPublicKey.toBase58()}\n\n`;
    
    const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
    const totalSolFormatted = portfolio.totalSol;
    
    output += `Total Value: $${totalUsdFormatted} (${totalSolFormatted} SOL)\n\n`;
    output += "Token Balances:\n";

    const nonZeroItems = portfolio.items.filter(item => 
      new BigNumber(item.uiAmount).isGreaterThan(0)
    );

    if (nonZeroItems.length === 0) {
      output += "No tokens found with non-zero balance\n";
    } else {
      for (const item of nonZeroItems) {
        const valueUsd = new BigNumber(item.valueUsd).toFixed(2);
        output += `${item.name} (${item.symbol}): ${
          new BigNumber(item.uiAmount).toFixed(6)
        } ($${valueUsd} | ${item.valueSol} SOL)\n`;
      }
    }

    output += "\nMarket Prices:\n";
    output += `SOL: $${new BigNumber(prices.solana.usd).toFixed(2)}\n`;
    output += `BTC: $${new BigNumber(prices.bitcoin.usd).toFixed(2)}\n`;
    output += `ETH: $${new BigNumber(prices.ethereum.usd).toFixed(2)}\n`;
    
    console.log("Formatted portfolio:", output);

    return output;
  }

  async getFormattedPortfolio(): Promise<string> {
    try {
      console.log("Generating formatted portfolio report...");
      const [portfolio, prices] = await Promise.all([
        this.fetchPortfolioValue(),
        this.fetchPrices()
      ]);
      
      console.log("Portfolio and prices fetched successfully");

      return this.formatPortfolio(portfolio, prices);
    } catch (error) {
      console.error("Error generating portfolio report:", error);
      return "Unable to fetch wallet information. Please try again later.";
    }
  }

  static getBotWalletAddress(): string {
    return `${BOT_WALLET.description}\nWallet Address: ${BOT_WALLET.publicKey}`;
  }
}

const walletProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    try {
      console.log("Initializing wallet provider...");
      // Always use the bot's wallet
      const publicKey = new PublicKey(BOT_WALLET.publicKey);
      const connection = new Connection(PROVIDER_CONFIG.DEFAULT_RPC);
      const provider = new WalletProvider(connection, publicKey);
      
      console.log("Wallet provider initialized successfully");

      return await provider.getFormattedPortfolio();
    } catch (error) {
      console.error("Error in wallet provider:", error);
      return "Failed to fetch wallet information. Please check your configuration.";
    }
  }
};

// Module exports
export default walletProvider;
export const getBotWalletAddress = WalletProvider.getBotWalletAddress;