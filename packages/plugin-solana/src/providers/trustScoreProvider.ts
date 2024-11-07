import {
    ProcessedTokenData,
    TokenSecurityData,
    // TokenTradeData,
    // DexScreenerData,
    // DexScreenerPair,
    // HolderData,
} from "@eliza/core/src/types/token.ts";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TokenProvider } from "./token.ts";
import { WalletProvider } from "./wallet.ts";
import {
    TrustScoreDatabase,
    RecommenderMetrics,
    TokenPerformance,
    TradePerformance,
} from "@eliza/core/src/adapters/trustScoreDatabase.ts";
import settings from "@eliza/core/src/core/settings.ts";
import { IAgentRuntime } from "@eliza/core/src/core/types.ts";

const Wallet = settings.MAIN_WALLET_ADDRESS;
interface TradeData {
    buy_amount: number;
    is_simulation: boolean;
}
interface sellDetails {
    sell_amount: number;
    sell_recommender_id: string | null;
}
export class TrustScoreProvider {
    private tokenProvider: TokenProvider;
    private trustScoreDb: TrustScoreDatabase;
    private connection: Connection = new Connection(process.env.RPC_URL!);
    private baseMint: PublicKey = new PublicKey(process.env.BASE_MINT!);
    private DECAY_RATE = 0.95;
    private MAX_DECAY_DAYS = 30;
    constructor(
        tokenProvider: TokenProvider,
        trustScoreDb: TrustScoreDatabase
    ) {
        this.tokenProvider = tokenProvider;
        this.trustScoreDb = trustScoreDb;
    }

    //getRecommenederBalance
    async getRecommenederBalance(recommenderWallet: string): Promise<number> {
        try {
            const tokenAta = await getAssociatedTokenAddress(
                new PublicKey(recommenderWallet),
                this.baseMint
            );
            const tokenBalInfo =
                await this.connection.getTokenAccountBalance(tokenAta);
            const tokenBalance = tokenBalInfo.value.amount;
            const balance = parseFloat(tokenBalance);
            return balance;
        } catch (error) {
            console.error("Error fetching balance", error);
            return 0;
        }
    }

    /**
     * Generates and saves trust score based on processed token data and user recommendations.
     * @param tokenAddress The address of the token to analyze.
     * @param recommenderId The UUID of the recommender.
     * @returns An object containing TokenPerformance and RecommenderMetrics.
     */
    async generateTrustScore(
        tokenAddress: string,
        recommenderId: string,
        recommenderWallet: string
    ): Promise<{
        tokenPerformance: TokenPerformance;
        recommenderMetrics: RecommenderMetrics;
    }> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        console.log(`Fetched processed token data for token: ${tokenAddress}`);

        const recommenderMetrics =
            await this.trustScoreDb.getRecommenderMetrics(recommenderId);

        const isRapidDump = await this.isRapidDump(tokenAddress);
        const sustainedGrowth = await this.sustainedGrowth(tokenAddress);
        const suspiciousVolume = await this.suspiciousVolume(tokenAddress);
        const balance = await this.getRecommenederBalance(recommenderWallet);
        const virtualConfidence = balance / 1000000; // TODO: create formula to calculate virtual confidence based on user balance
        const lastActive = recommenderMetrics.lastActiveDate;
        const now = new Date();
        const inactiveDays = Math.floor(
            (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );
        const decayFactor = Math.pow(
            this.DECAY_RATE,
            Math.min(inactiveDays, this.MAX_DECAY_DAYS)
        );
        const decayedScore = recommenderMetrics.trustScore * decayFactor;
        const validationTrustScore =
            this.trustScoreDb.calculateValidationTrust(tokenAddress);

        return {
            tokenPerformance: {
                tokenAddress:
                    processedData.dexScreenerData.pairs[0]?.baseToken.address ||
                    "",
                priceChange24h:
                    processedData.tradeData.price_change_24h_percent,
                volumeChange24h: processedData.tradeData.volume_24h,
                trade_24h_change:
                    processedData.tradeData.trade_24h_change_percent,
                liquidity:
                    processedData.dexScreenerData.pairs[0]?.liquidity.usd || 0,
                liquidityChange24h: 0,
                holderChange24h:
                    processedData.tradeData.unique_wallet_24h_change_percent,
                rugPull: false, // TODO: Implement rug pull detection
                isScam: false, // TODO: Implement scam detection
                marketCapChange24h: 0, // TODO: Implement market cap change
                sustainedGrowth: sustainedGrowth,
                rapidDump: isRapidDump,
                suspiciousVolume: suspiciousVolume,
                validationTrust: validationTrustScore,
                lastUpdated: new Date(),
            },
            recommenderMetrics: {
                recommenderId: recommenderId,
                trustScore: recommenderMetrics.trustScore,
                totalRecommendations: recommenderMetrics.totalRecommendations,
                successfulRecs: recommenderMetrics.successfulRecs,
                avgTokenPerformance: recommenderMetrics.avgTokenPerformance,
                riskScore: recommenderMetrics.riskScore,
                consistencyScore: recommenderMetrics.consistencyScore,
                virtualConfidence: virtualConfidence,
                lastActiveDate: now,
                trustDecay: decayedScore,
                lastUpdated: new Date(),
            },
        };
    }

    async updateRecommenderMetrics(
        recommenderId: string,
        tokenPerformance: TokenPerformance,
        recommenderWallet: string
    ): Promise<void> {
        const recommenderMetrics =
            await this.trustScoreDb.getRecommenderMetrics(recommenderId);

        const totalRecommendations =
            recommenderMetrics.totalRecommendations + 1;
        const successfulRecs = tokenPerformance.rugPull
            ? recommenderMetrics.successfulRecs
            : recommenderMetrics.successfulRecs + 1;
        const avgTokenPerformance =
            (recommenderMetrics.avgTokenPerformance *
                recommenderMetrics.totalRecommendations +
                tokenPerformance.priceChange24h) /
            totalRecommendations;

        const overallTrustScore = this.calculateTrustScore(
            tokenPerformance,
            recommenderMetrics
        );
        const riskScore = this.calculateOverallRiskScore(
            tokenPerformance,
            recommenderMetrics
        );
        const consistencyScore = this.calculateConsistencyScore(
            tokenPerformance,
            recommenderMetrics
        );

        const balance = await this.getRecommenederBalance(recommenderWallet);
        const virtualConfidence = balance / 1000000; // TODO: create formula to calculate virtual confidence based on user balance
        const lastActive = recommenderMetrics.lastActiveDate;
        const now = new Date();
        const inactiveDays = Math.floor(
            (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );
        const decayFactor = Math.pow(
            this.DECAY_RATE,
            Math.min(inactiveDays, this.MAX_DECAY_DAYS)
        );
        const decayedScore = recommenderMetrics.trustScore * decayFactor;

        const newRecommenderMetrics: RecommenderMetrics = {
            recommenderId: recommenderId,
            trustScore: overallTrustScore,
            totalRecommendations: totalRecommendations,
            successfulRecs: successfulRecs,
            avgTokenPerformance: avgTokenPerformance,
            riskScore: riskScore,
            consistencyScore: consistencyScore,
            virtualConfidence: virtualConfidence,
            lastActiveDate: new Date(),
            trustDecay: decayedScore,
            lastUpdated: new Date(),
        };

        await this.trustScoreDb.updateRecommenderMetrics(newRecommenderMetrics);
    }

    calculateTrustScore(
        tokenPerformance: TokenPerformance,
        recommenderMetrics: RecommenderMetrics
    ): number {
        const riskScore = this.calculateRiskScore(tokenPerformance);
        const consistencyScore = this.calculateConsistencyScore(
            tokenPerformance,
            recommenderMetrics
        );

        return (riskScore + consistencyScore) / 2;
    }

    calculateOverallRiskScore(
        tokenPerformance: TokenPerformance,
        recommenderMetrics: RecommenderMetrics
    ) {
        const riskScore = this.calculateRiskScore(tokenPerformance);
        const consistencyScore = this.calculateConsistencyScore(
            tokenPerformance,
            recommenderMetrics
        );

        return (riskScore + consistencyScore) / 2;
    }

    calculateRiskScore(tokenPerformance: TokenPerformance): number {
        let riskScore = 0;
        if (tokenPerformance.rugPull) {
            riskScore += 10;
        }
        if (tokenPerformance.isScam) {
            riskScore += 10;
        }
        if (tokenPerformance.rapidDump) {
            riskScore += 5;
        }
        if (tokenPerformance.suspiciousVolume) {
            riskScore += 5;
        }
        return riskScore;
    }

    calculateConsistencyScore(
        tokenPerformance: TokenPerformance,
        recommenderMetrics: RecommenderMetrics
    ): number {
        const avgTokenPerformance = recommenderMetrics.avgTokenPerformance;
        const priceChange24h = tokenPerformance.priceChange24h;

        return Math.abs(priceChange24h - avgTokenPerformance);
    }

    async suspiciousVolume(tokenAddress: string): Promise<boolean> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        const unique_wallet_24h = processedData.tradeData.unique_wallet_24h;
        const volume_24h = processedData.tradeData.volume_24h;
        const suspiciousVolume = unique_wallet_24h / volume_24h > 0.5;
        console.log(`Fetched processed token data for token: ${tokenAddress}`);
        return suspiciousVolume;
    }

    async sustainedGrowth(tokenAddress: string): Promise<boolean> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        console.log(`Fetched processed token data for token: ${tokenAddress}`);

        return processedData.tradeData.volume_24h_change_percent > 50;
    }

    async isRapidDump(tokenAddress: string): Promise<boolean> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        console.log(`Fetched processed token data for token: ${tokenAddress}`);

        return processedData.tradeData.trade_24h_change_percent < -50;
    }

    async checkTrustScore(tokenAddress: string): Promise<TokenSecurityData> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        console.log(`Fetched processed token data for token: ${tokenAddress}`);

        return {
            ownerBalance: processedData.security.ownerBalance,
            creatorBalance: processedData.security.creatorBalance,
            ownerPercentage: processedData.security.ownerPercentage,
            creatorPercentage: processedData.security.creatorPercentage,
            top10HolderBalance: processedData.security.top10HolderBalance,
            top10HolderPercent: processedData.security.top10HolderPercent,
        };
    }

    /**
     * Creates a TradePerformance object based on token data and recommender.
     * @param tokenAddress The address of the token.
     * @param recommenderId The UUID of the recommender.
     * @param data ProcessedTokenData.
     * @returns TradePerformance object.
     */
    async createTradePerformance(
        runtime: IAgentRuntime,
        tokenAddress: string,
        recommenderId: string,
        data: TradeData
    ): Promise<TradePerformance> {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        const wallet = new WalletProvider(
            new Connection("https://api.mainnet-beta.solana.com"),
            new PublicKey(Wallet!)
        );
        const prices = await wallet.fetchPrices(runtime);
        const solPrice = prices.solana.usd;
        const buySol = data.buy_amount / parseFloat(solPrice);
        const buy_value_usd = data.buy_amount * processedData.tradeData.price;

        const creationData = {
            token_address: tokenAddress,
            recommender_id: recommenderId,
            buy_price: processedData.tradeData.price,
            sell_price: 0,
            buy_timeStamp: new Date().toISOString(),
            sell_timeStamp: "",
            buy_amount: data.buy_amount,
            sell_amount: 0,
            buy_sol: buySol,
            received_sol: 0,
            buy_value_usd: buy_value_usd,
            sell_value_usd: 0,
            profit_usd: 0,
            profit_percent: 0,
            buy_market_cap:
                processedData.dexScreenerData.pairs[0]?.marketCap || 0,
            sell_market_cap: 0,
            market_cap_change: 0,
            buy_liquidity:
                processedData.dexScreenerData.pairs[0]?.liquidity.usd || 0,
            sell_liquidity: 0,
            liquidity_change: 0,
            last_updated: new Date().toISOString(),
            rapidDump: false,
        };
        this.trustScoreDb.addTradePerformance(creationData, data.is_simulation);
        return creationData;
    }

    /**
     * Updates a trade with sell details.
     * @param tokenAddress The address of the token.
     * @param recommenderId The UUID of the recommender.
     * @param buyTimeStamp The timestamp when the buy occurred.
     * @param sellDetails An object containing sell-related details.
     * @param isSimulation Whether the trade is a simulation. If true, updates in simulation_trade; otherwise, in trade.
     * @returns boolean indicating success.
     */

    async updateSellDetails(
        runtime: IAgentRuntime,
        tokenAddress: string,
        recommenderId: string,
        sellTimeStamp: string,
        sellDetails: sellDetails,
        isSimulation: boolean
    ) {
        const processedData: ProcessedTokenData =
            await this.tokenProvider.getProcessedTokenData();
        const wallet = new WalletProvider(
            new Connection("https://api.mainnet-beta.solana.com"),
            new PublicKey(Wallet!)
        );
        const prices = await wallet.fetchPrices(runtime);
        const solPrice = prices.solana.usd;
        const sellSol = sellDetails.sell_amount / parseFloat(solPrice);
        const sell_value_usd =
            sellDetails.sell_amount * processedData.tradeData.price;
        const trade = await this.trustScoreDb.getLatestTradePerformance(
            tokenAddress,
            recommenderId,
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

        const isRapidDump = await this.isRapidDump(tokenAddress);

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
            recommenderId,
            buyTimeStamp,
            sellDetailsData,
            isSimulation
        );
        return sellDetailsData;
    }
}
