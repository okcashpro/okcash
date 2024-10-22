// TokenBalanceProvider.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenBalance, getTokenPriceInSol } from "./tokenUtils";

export class TokenBalanceProvider {
  private connection: Connection;
  private walletPublicKey: PublicKey;

  constructor(connection: Connection, walletPublicKey: PublicKey) {
    this.connection = connection;
    this.walletPublicKey = walletPublicKey;
  }

  async getFormattedTokenBalances(): Promise<string> {
    const tokenBalances = await getTokenBalance(this.connection, this.walletPublicKey);
    
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
}