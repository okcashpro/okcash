import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import fetch from "cross-fetch";
import { IAgentRuntime, Memory, Provider, State } from "../core/types.ts";

export async function getTokenPriceInSol(tokenSymbol: string): Promise<number> {
  const response = await fetch(`https://price.jup.ag/v6/price?ids=${tokenSymbol}`);
  const data = await response.json();
  return data.data[tokenSymbol].price;
}

async function getTokenBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  tokenMintAddress: PublicKey
): Promise<number> {
  const tokenAccountAddress = await getAssociatedTokenAddress(tokenMintAddress, walletPublicKey);

  try {
    const tokenAccount = await getAccount(connection, tokenAccountAddress);
    const tokenAmount = tokenAccount.amount as unknown as number;
    return tokenAmount;
  } catch (error) {
    console.error(`Error retrieving balance for token: ${tokenMintAddress.toBase58()}`, error);
    return 0;
  }
}

async function getTokenBalances(
  connection: Connection,
  walletPublicKey: PublicKey
): Promise<{ [tokenName: string]: number }> {
  const tokenBalances: { [tokenName: string]: number } = {};

  // Add the token mint addresses you want to retrieve balances for
  const tokenMintAddresses = [
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
    new PublicKey("So11111111111111111111111111111111111111112"), // SOL
    // Add more token mint addresses as needed
  ];

  for (const mintAddress of tokenMintAddresses) {
    const tokenName = getTokenName(mintAddress);
    const balance = await getTokenBalance(connection, walletPublicKey, mintAddress);
    tokenBalances[tokenName] = balance;
  }

  return tokenBalances;
}

function getTokenName(mintAddress: PublicKey): string {
  // Implement a mapping of mint addresses to token names
  const tokenNameMap: { [mintAddress: string]: string } = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "So11111111111111111111111111111111111111112": "SOL",
    // Add more token mint addresses and their corresponding names
  };

  return tokenNameMap[mintAddress.toBase58()] || "Unknown Token";
}

export { getTokenBalance, getTokenBalances };


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


const walletProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const walletPublicKey = new PublicKey(runtime.getSetting("WALLET_PUBLIC_KEY"));
      const connection = new Connection(runtime.getSetting("RPC_ENDPOINT"));

      const provider = new WalletProvider(connection, walletPublicKey);
      const portfolio = await provider.fetchPortfolioValue(walletPublicKey.toBase58());
      const prices = await provider.fetchPrices();

      let formattedBalances = `Wallet Address: ${walletPublicKey.toBase58()}\n\n`;
      formattedBalances += `Total Portfolio Value: $${portfolio.totalUsd}\n\n`;
      formattedBalances += "Token Balances:\n";

      for (const item of portfolio.items) {
        formattedBalances += `${item.name} (${item.symbol}): ${item.uiAmount} ($${item.valueUSD})\n`;
      }

      formattedBalances += "\nCurrent Prices:\n";
      formattedBalances += `Solana: $${prices.solana.usd}\n`;
      formattedBalances += `Bitcoin: $${prices.bitcoin.usd}\n`;
      formattedBalances += `Ethereum: $${prices.ethereum.usd}\n`;

      return formattedBalances;
    } catch (error) {
      console.error("Error fetching wallet information:", error);
      return "Failed to fetch wallet information.";
    }
  },
};

export default walletProvider;