import {
   PublicKey,
   Keypair,
   Connection,
   VersionedTransaction,
   LAMPORTS_PER_SOL,
   RpcResponseAndContext,
   TokenAmount,
   SimulatedTransactionResponse,
   Blockhash,
   BlockhashWithExpiryBlockHeight,
 } from "@solana/web3.js";
 import { getAssociatedTokenAddress } from "@solana/spl-token";
import settings from "../core/settings";
 
 const solAddress = settings.SOL_ADDRESS;
 const SLIPPAGE = settings.SLIPPAGE;
 const connection = new Connection(settings.RPC_URL!);
 const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 
 export async function delayedCall<T>(
   method: (...args: any[]) => Promise<T>,
   ...args: any[]
 ): Promise<T> {
   await delay(150);
   return method(...args);
 }
 
 export const executeSwap = async (
   transaction: VersionedTransaction,
   type: "buy" | "sell"
 ) => {
   try {
     const latestBlockhash: BlockhashWithExpiryBlockHeight = await delayedCall(
       connection.getLatestBlockhash.bind(connection)
     );
     const signature = await connection.sendTransaction(transaction, {
       skipPreflight: false,
     });
     const confirmation = await connection.confirmTransaction(
       {
         signature,
         lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
         blockhash: latestBlockhash.blockhash,
       },
       "finalized"
     );
     if (confirmation.value.err) {
       console.log("Confirmation error", confirmation.value.err);
 
       throw new Error("Confirmation error");
     } else {
       if (type === "buy") {
         console.log("Buy successful: https://solscan.io/tx/${signature}");
       } else {
         console.log("Sell successful: https://solscan.io/tx/${signature}");
       }
     }
 
     return signature;
   } catch (error) {
     console.log(error);
   }
 };
 
 export const Sell = async (baseMint: PublicKey, wallet: Keypair) => {
   try {
     const tokenAta = await delayedCall(
       getAssociatedTokenAddress,
       baseMint,
       wallet.publicKey
     );
     const tokenBalInfo: RpcResponseAndContext<TokenAmount> = await delayedCall(
       connection.getTokenAccountBalance.bind(connection),
       tokenAta
     );
 
     if (!tokenBalInfo) {
       console.log("Balance incorrect");
       return null;
     }
 
     const tokenBalance = tokenBalInfo.value.amount;
     if (tokenBalance === "0") {
       console.warn(`No token balance to sell with wallet ${wallet.publicKey}`);
     }
 
     const sellTransaction = await getSwapTxWithWithJupiter(
       wallet,
       baseMint,
       tokenBalance,
       "sell"
     );
     // simulate the transaction
     if (!sellTransaction) {
       console.log("Failed to get sell transaction");
       return null;
     }
 
     const simulateResult: RpcResponseAndContext<SimulatedTransactionResponse> =
       await delayedCall(
         connection.simulateTransaction.bind(connection),
         sellTransaction
       );
     if (simulateResult.value.err) {
       console.log("Sell Simulation failed", simulateResult.value.err);
       return null;
     }
 
     // execute the transaction
     return executeSwap(sellTransaction, "sell");
   } catch (error) {
     console.log(error);
   }
 };
 
 export const Buy = async (baseMint: PublicKey, wallet: Keypair) => {
   try {
     const tokenAta = await delayedCall(
       getAssociatedTokenAddress,
       baseMint,
       wallet.publicKey
     );
     const tokenBalInfo: RpcResponseAndContext<TokenAmount> = await delayedCall(
       connection.getTokenAccountBalance.bind(connection),
       tokenAta
     );
 
     if (!tokenBalInfo) {
       console.log("Balance incorrect");
       return null;
     }
 
     const tokenBalance = tokenBalInfo.value.amount;
     if (tokenBalance === "0") {
       console.warn(`No token balance to sell with wallet ${wallet.publicKey}`);
     }
 
     const buyTransaction = await getSwapTxWithWithJupiter(
       wallet,
       baseMint,
       tokenBalance,
       "buy"
     );
     // simulate the transaction
     if (!buyTransaction) {
       console.log("Failed to get buy transaction");
       return null;
     }
 
     const simulateResult: RpcResponseAndContext<SimulatedTransactionResponse> =
       await delayedCall(
         connection.simulateTransaction.bind(connection),
         buyTransaction
       );
     if (simulateResult.value.err) {
       console.log("Buy Simulation failed", simulateResult.value.err);
       return null;
     }
 
     // execute the transaction
     return executeSwap(buyTransaction, "buy");
   } catch (error) {
     console.log(error);
   }
 };
 
 export const getSwapTxWithWithJupiter = async (
   wallet: Keypair,
   baseMint: PublicKey,
   amount: string,
   type: "buy" | "sell"
 ) => {
   try {
     switch (type) {
       case "buy":
         return fetchBuyTransaction(wallet, baseMint, amount);
       case "sell":
         return fetchSellTransaction(wallet, baseMint, amount);
       default:
         return fetchSellTransaction(wallet, baseMint, amount);
     }
   } catch (error) {
     console.log(error);
   }
 };
 
 export const fetchBuyTransaction = async (
   wallet: Keypair,
   baseMint: PublicKey,
   amount: string
 ) => {
   try {
     const quoteResponse = await (
       await fetch(
         `https://quote-api.jup.ag/v6/quote?inputMint=${solAddress}&outputMint=${baseMint.toBase58()}&amount=${amount}&slippageBps=${SLIPPAGE}`
       )
     ).json();
     const { swapTransaction } = await (
       await fetch("https://quote-api.jup.ag/v6/swap", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           quoteResponse,
           userPublicKey: wallet.publicKey.toString(),
           wrapAndUnwrapSol: true,
           dynamicComputeUnitLimit: true,
           prioritizationFeeLamports: 100000,
         }),
       })
     ).json();
     if (!swapTransaction) {
       console.log("Failed to get buy transaction");
       return null;
     }
 
     // deserialize the transaction
     const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
     var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
 
     // sign the transaction
     transaction.sign([wallet]);
     return transaction;
   } catch (error) {
     console.log("Failed to get buy transaction", error);
     return null;
   }
 };
 
 export const fetchSellTransaction = async (
   wallet: Keypair,
   baseMint: PublicKey,
   amount: string
 ) => {
   try {
     const quoteResponse = await (
       await fetch(
         `https://quote-api.jup.ag/v6/quote?inputMint=${baseMint.toBase58()}&outputMint=${solAddress}&amount=${amount}&slippageBps=${SLIPPAGE}`
       )
     ).json();
 
     // get serialized transactions for the swap
     const { swapTransaction } = await (
       await fetch("https://quote-api.jup.ag/v6/swap", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           quoteResponse,
           userPublicKey: wallet.publicKey.toString(),
           wrapAndUnwrapSol: true,
           dynamicComputeUnitLimit: true,
           prioritizationFeeLamports: 52000,
         }),
       })
     ).json();
     if (!swapTransaction) {
       console.log("Failed to get sell transaction");
       return null;
     }
 
     // deserialize the transaction
     const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
     var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
 
     // sign the transaction
     transaction.sign([wallet]);
     return transaction;
   } catch (error) {
     console.log("Failed to get sell transaction", error);
     return null;
   }
 };
 