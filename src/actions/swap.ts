export class TokenSwapAction {
    private connection: Connection;
    private walletPublicKey: PublicKey;
  
    constructor(connection: Connection, walletPublicKey: PublicKey) {
      this.connection = connection;
      this.walletPublicKey = walletPublicKey;
    }
  
    async execute(
      inputTokenSymbol: string, 
      outputTokenSymbol: string, 
      amount: number
    ): Promise<void> {
      try {
        const swapResult = await swapToken(
          this.connection,
          this.walletPublicKey,
          inputTokenSymbol,
          outputTokenSymbol,
          amount
        );
  
        console.log("Swap Quote:");
        console.log(swapResult.quote);
  
        const confirmSwap = await promptConfirmation();
        if (!confirmSwap) {
          console.log("Swap canceled by user");
          return;
        }
  
        const transaction = Transaction.from(Buffer.from(swapResult.swapTransaction, "base64"));
        transaction.sign(this.walletKeyPair);
        
        const txid = await this.connection.sendRawTransaction(transaction.serialize());
        await this.connection.confirmTransaction(txid);
  
        console.log("Swap completed successfully!");
        console.log(`Transaction ID: ${txid}`);
      } catch (error) {
        console.error("Error during token swap:", error);
      }
    }
  }
  