import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import fetch from "cross-fetch";
import {
    ActionExample,
    IAgentRuntime,
    Memory,
    type Action,
} from "../core/types.ts";

async function swapToken(
    connection: Connection,
    walletPublicKey: PublicKey,
    inputTokenSymbol: string,
    outputTokenSymbol: string,
    amount: number
): Promise<any> {
    const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputTokenSymbol}&outputMint=${outputTokenSymbol}&amount=${amount * 10 ** 6}&slippageBps=50`
    );
    const quoteData = await quoteResponse.json();

    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            quoteResponse: quoteData.data,
            userPublicKey: walletPublicKey.toString(),
            wrapAndUnwrapSol: true,
        }),
    });

    return await swapResponse.json();
}

async function promptConfirmation(): Promise<boolean> {
    // Implement your own confirmation logic here
    // This is just a placeholder example
    const confirmSwap = window.confirm("Confirm the token swap?");
    return confirmSwap;
}

export const executeSwap: Action = {
    name: "EXECUTE_SWAP",
    similes: ["SWAP_TOKENS", "TOKEN_SWAP", "TRADE_TOKENS", "EXCHANGE_TOKENS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Check if the necessary parameters are provided in the message
        console.log("Message:", message);
        return true;
    },
    description: "Perform a token swap.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        const { inputTokenSymbol, outputTokenSymbol, amount } = message.content;

        try {
            const connection = new Connection(
                "https://api.mainnet-beta.solana.com"
            );
            const walletPublicKey = new PublicKey(
                runtime.getSetting("WALLET_PUBLIC_KEY")
            );

            const swapResult = await swapToken(
                connection,
                walletPublicKey,
                inputTokenSymbol as string,
                outputTokenSymbol as string,
                amount as number
            );

            console.log("Swap Quote:");
            console.log(swapResult.quote);

            const confirmSwap = await promptConfirmation();
            if (!confirmSwap) {
                console.log("Swap canceled by user");
                return false;
            }

            const transaction = Transaction.from(
                Buffer.from(swapResult.swapTransaction, "base64")
            );
            const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY");
            const keypair = Keypair.fromSecretKey(
                Uint8Array.from(Buffer.from(privateKey, "base64"))
            );
            transaction.sign(keypair);

            const txid = await connection.sendRawTransaction(
                transaction.serialize()
            );
            await connection.confirmTransaction(txid);

            console.log("Swap completed successfully!");
            console.log(`Transaction ID: ${txid}`);

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    inputTokenSymbol: "SOL",
                    outputTokenSymbol: "USDC",
                    amount: 0.1,
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swapping 0.1 SOL for USDC...",
                    action: "TOKEN_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction ID: ...",
                },
            },
        ],
        // Add more examples as needed
    ] as ActionExample[][],
} as Action;
