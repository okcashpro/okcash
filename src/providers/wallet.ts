// TokenBalanceProvider.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenBalances, getTokenPriceInSol } from "./tokenUtils";
import fetch from "cross-fetch";

interface Item {
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  uiAmount: string;
  priceUSD: string;
  valueUSD: string;
}
interface walletPortfolio {
  totalUsd: string;
  items: Array<Item>;
}
interface price {
  usd: string;
}
interface Prices { 
  solana: price;
  bitcoin: price;
  ethereum: price;
  
}
const API_Key = ""
export class WalletProvider {
  private connection: Connection;
  private walletPublicKey: PublicKey;

  constructor(connection: Connection, walletPublicKey: PublicKey) {
    this.connection = connection;
    this.walletPublicKey = walletPublicKey;
  }

  async getFormattedTokenBalances(): Promise<string> {
    const tokenBalances = await getTokenBalances(this.connection, this.walletPublicKey);
    
    let formattedBalances = "Token Balances:\n";
    let totalValueInSol = 0;

    for (const [tokenName, balance] of Object.entries(tokenBalances)) {
      const tokenPrice = await getTokenPriceInSol(tokenName);
      const totalValue = balance * tokenPrice;
      totalValueInSol += totalValue;

      formattedBalances += `${tokenName}: ${balance} (${totalValue} SOL)\n`;
    }

    formattedBalances += `\nTotal Value: ${totalValueInSol} SOL`;

    return formattedBalances;
  }

  async fetchPortfolioValue(walletPublicKey:string): Promise<walletPortfolio> { 
    try {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': API_Key
        }
      };
      const walletPortfolio = await fetch(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${walletPublicKey}`,
        options
      );
      const walletPortfolioJson = await walletPortfolio.json();
      const data = walletPortfolioJson.data;
      const totalUsd = data.totalUsd;
      const items = data.items;
      const walletPortfolioFormatted = {
        totalUsd,
        items
      };
      return walletPortfolioFormatted;
    } catch (error) {
      console.log(error);
    }
  }

  async fetchPrices(): Promise<Prices> {
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
    const ids = 'solana,bitcoin,ethereum';
    const vsCurrencies = 'usd';
  
    try {
      const response = await fetch(`${apiUrl}?ids=${ids}&vs_currencies=${vsCurrencies}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Error fetching prices:', error);
    }
  }
}