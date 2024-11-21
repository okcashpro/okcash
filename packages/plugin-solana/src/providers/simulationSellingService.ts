import {
    TrustScoreDatabase,
    TokenPerformance,
    TradePerformance,
    TokenRecommendation,
    ProcessedTokenData,
} from "@ai16z/plugin-trustdb";
import { Connection, PublicKey } from "@solana/web3.js";
// Assuming TokenProvider and IAgentRuntime are available
import { TokenProvider } from "./token.ts";
import { settings } from "@ai16z/eliza";
import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import { WalletProvider } from "./wallet.ts";

interface sellDetails {
    sell_amount: number;
    sell_recommender_id: string | null;
}

export class simulationSellingService {
    private trustScoreDb: TrustScoreDatabase;
    private walletProvider: WalletProvider;
    private connection: Connection;
    private baseMint: PublicKey;
    private DECAY_RATE = 0.95;
    private MAX_DECAY_DAYS = 30;
    private backend: string;
    private backendToken: string;

    constructor(
        runtime: IAgentRuntime,
        trustScoreDb: TrustScoreDatabase,
        walletProvider: WalletProvider
    ) {
        this.trustScoreDb = trustScoreDb;

        this.connection = new Connection(runtime.getSetting("RPC_URL"));
        this.walletProvider = new WalletProvider(
            this.connection,
            new PublicKey(runtime.getSetting("WALLET_PUBLIC_KEY"))
        );
        this.baseMint = new PublicKey(
            runtime.getSetting("BASE_MINT") ||
                "So11111111111111111111111111111111111111112"
        );
        this.backend = runtime.getSetting("BACKEND_URL");
        this.backendToken = runtime.getSetting("BACKEND_TOKEN");
    }

    public async startService() {
        // starting the service
        console.log("Starting SellingService...");
        await this.scanAndSell();
    }

    private async scanAndSell() {
        // scanning recommendations and selling
        console.log("Scanning for token performances...");
        const tokenPerformances =
            await this.trustScoreDb.getAllTokenPerformancesWithBalance();

        const sellDecisions = this.decideWhenToSell(tokenPerformances);

        // Execute sells
        await this.executeSells(sellDecisions);

        // Perform stop loss checks
        await this.performStopLoss(tokenPerformances);
    }

    private decideWhenToSell(
        tokenPerformances: TokenPerformance[]
    ): SellDecision[] {
        //  To Do: logic when to sell and how much
        console.log("Deciding when to sell and how much...");
        const decisions: SellDecision[] = [];

        tokenPerformances.forEach(async (performance) => {
            const tokenProvider = new TokenProvider(
                performance.tokenAddress,
                this.walletProvider
            );
            const sellAmount = await this.amountToSell(
                performance.tokenAddress,
                tokenProvider
            );
            const amountToSell = sellAmount.sellAmount;
            decisions.push({ tokenPerformance: performance, amountToSell });
        });

        return decisions;
    }

    async amountToSell(tokenAddress: string, tokenProvider: TokenProvider) {
        // To Do: Implement logic to decide how much to sell
        //placeholder
        const processedData: ProcessedTokenData =
            await tokenProvider.getProcessedTokenData();
        const prices = await this.walletProvider.fetchPrices(null);
        const solPrice = prices.solana.usd;
        const tokenBalance = this.trustScoreDb.getTokenBalance(tokenAddress);

        const sellAmount = tokenBalance * 0.1;
        const sellSol = sellAmount / parseFloat(solPrice);
        const sellValueUsd = sellAmount * processedData.tradeData.price;

        return { sellAmount, sellSol, sellValueUsd };
    }

    private async executeSells(decisions: SellDecision[]) {
        console.log("Executing sell orders...");
        for (const decision of decisions) {
            console.log(
                `Selling ${decision.amountToSell} of token ${decision.tokenPerformance.tokenSymbol}`
            );
            // update the sell details
            const sellDetails = {
                sell_amount: decision.amountToSell,
                sell_recommender_id: null,
            };
            const sellTimeStamp = new Date().toISOString();
            const tokenProvider = new TokenProvider(
                decision.tokenPerformance.tokenAddress,
                this.walletProvider
            );
            const sellDetailsData = await this.updateSellDetails(
                decision.tokenPerformance.tokenAddress,
                decision.tokenPerformance.recommenderId,
                sellTimeStamp,
                sellDetails,
                true,
                tokenProvider
            );
            console.log("Sell order executed successfully", sellDetailsData);
        }
    }

    private async performStopLoss(tokenPerformances: TokenPerformance[]) {
        console.log("Performing stop loss checks...");
        // To Do: Implement stop loss logic
        // check if the token has dropped by more than 50% in the last 24 hours
        for (const performance of tokenPerformances) {
            const tokenProvider = new TokenProvider(
                performance.tokenAddress,
                this.walletProvider
            );
            const processedData: ProcessedTokenData =
                await tokenProvider.getProcessedTokenData();
            if (processedData.tradeData.trade_24h_change_percent < -50) {
                const sellAmount = performance.balance;
                const sellSol = sellAmount / 100;
                const sellValueUsd = sellAmount * processedData.tradeData.price;
                const sellDetails = {
                    sell_amount: sellAmount,
                    sell_recommender_id: null,
                };
                const sellTimeStamp = new Date().toISOString();
                const sellDetailsData = await this.updateSellDetails(
                    performance.tokenAddress,
                    performance.recommenderId,
                    sellTimeStamp,
                    sellDetails,
                    true,
                    tokenProvider
                );
                console.log(
                    "Stop loss triggered. Sell order executed successfully",
                    sellDetailsData
                );
            }
        }
    }

    async updateSellDetails(
        tokenAddress: string,
        recommenderId: string,
        sellTimeStamp: string,
        sellDetails: sellDetails,
        isSimulation: boolean,
        tokenProvider: TokenProvider
    ) {
        // To Do: Change the logic after codex update
        const recommender =
            await this.trustScoreDb.getOrCreateRecommenderWithTelegramId(
                recommenderId
            );
        const processedData: ProcessedTokenData =
            await tokenProvider.getProcessedTokenData();
        const prices = await this.walletProvider.fetchPrices(null);
        const solPrice = prices.solana.usd;
        const sellSol = sellDetails.sell_amount / parseFloat(solPrice);
        const sell_value_usd =
            sellDetails.sell_amount * processedData.tradeData.price;
        const trade = await this.trustScoreDb.getLatestTradePerformance(
            tokenAddress,
            recommender.id,
            isSimulation
        );
        const buyTimeStamp = trade.buy_timeStamp;
        const marketCap =
            processedData.dexScreenerData.pairs[0]?.marketCap || 0;
        const liquidity =
            processedData.dexScreenerData.pairs[0]?.liquidity.usd || 0;
        const sell_price = processedData.tradeData.price;
        const profit_usd = sell_value_usd - trade.buy_value_usd;
        const profit_percent = (profit_usd / trade.buy_value_usd) * 100;

        const market_cap_change = marketCap - trade.buy_market_cap;
        const liquidity_change = liquidity - trade.buy_liquidity;

        const isRapidDump = await this.isRapidDump(tokenAddress, tokenProvider);

        const sellDetailsData = {
            sell_price: sell_price,
            sell_timeStamp: sellTimeStamp,
            sell_amount: sellDetails.sell_amount,
            received_sol: sellSol,
            sell_value_usd: sell_value_usd,
            profit_usd: profit_usd,
            profit_percent: profit_percent,
            sell_market_cap: marketCap,
            market_cap_change: market_cap_change,
            sell_liquidity: liquidity,
            liquidity_change: liquidity_change,
            rapidDump: isRapidDump,
            sell_recommender_id: sellDetails.sell_recommender_id || null,
        };
        this.trustScoreDb.updateTradePerformanceOnSell(
            tokenAddress,
            recommender.id,
            buyTimeStamp,
            sellDetailsData,
            isSimulation
        );

        // If the trade is a simulation update the balance
        const oldBalance = this.trustScoreDb.getTokenBalance(tokenAddress);
        const tokenBalance = oldBalance - sellDetails.sell_amount;
        this.trustScoreDb.updateTokenBalance(tokenAddress, tokenBalance);
        // generate some random hash for simulations
        const hash = Math.random().toString(36).substring(7);
        const transaction = {
            tokenAddress: tokenAddress,
            type: "sell",
            transactionHash: hash,
            amount: sellDetails.sell_amount,
            price: processedData.tradeData.price,
            isSimulation: true,
            timestamp: new Date().toISOString(),
        };
        this.trustScoreDb.addTransaction(transaction);
        this.updateTradeInBe(
            tokenAddress,
            recommender.id,
            recommender.telegramId,
            sellDetailsData,
            tokenBalance
        );

        return sellDetailsData;
    }
    async isRapidDump(
        tokenAddress: string,
        tokenProvider: TokenProvider
    ): Promise<boolean> {
        const processedData: ProcessedTokenData =
            await tokenProvider.getProcessedTokenData();
        console.log(`Fetched processed token data for token: ${tokenAddress}`);

        return processedData.tradeData.trade_24h_change_percent < -50;
    }

    async delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async updateTradeInBe(
        tokenAddress: string,
        recommenderId: string,
        username: string,
        data: sellDetails,
        balanceLeft: number,
        retries = 3,
        delayMs = 2000
    ) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await fetch(
                    `${this.backend}/api/updaters/updateTradePerformance`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${this.backendToken}`,
                        },
                        body: JSON.stringify({
                            tokenAddress: tokenAddress,
                            tradeData: data,
                            recommenderId: recommenderId,
                            username: username,
                            isSimulation: true,
                            balanceLeft: balanceLeft,
                        }),
                    }
                );
                // If the request is successful, exit the loop
                return;
            } catch (error) {
                console.error(
                    `Attempt ${attempt} failed: Error creating trade in backend`,
                    error
                );
                if (attempt < retries) {
                    console.log(`Retrying in ${delayMs} ms...`);
                    await this.delay(delayMs); // Wait for the specified delay before retrying
                } else {
                    console.error("All attempts failed.");
                }
            }
        }
    }
}

// SellDecision interface
interface SellDecision {
    tokenPerformance: TokenPerformance;
    amountToSell: number;
}
