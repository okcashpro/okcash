import {
  ProcessedTokenData,
  TokenSecurityData,
  TokenTradeData,
  DexScreenerData,
  DexScreenerPair,
  HolderData,
} from "../types/token";
import { Connection } from "@solana/web3.js";
import { TokenProvider } from "./token";
import {
  TrustScoreDatabase,
  RecommenderMetrics,
  TokenPerformance,
} from "../adapters/trustScoreDatabase";

export class TrustScoreProvider {
  private tokenProvider: TokenProvider;
  private trustScoreDb: TrustScoreDatabase;

  constructor(tokenProvider: TokenProvider, trustScoreDb: TrustScoreDatabase) {
    this.tokenProvider = tokenProvider;
    this.trustScoreDb = trustScoreDb;
  }
  /**
   * Generates and saves trust score based on processed token data and user recommendations.
   * @param tokenAddress The address of the token to analyze.
   * @param recommenderId The UUID of the recommender.
   * @returns An object containing TokenPerformance and RecommenderMetrics.
   */
  async generateTrustScore(
    tokenAddress: string,
    recommenderId: string
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

    return {
      tokenPerformance: {
        tokenAddress:
          processedData.dexScreenerData.pairs[0]?.baseToken.address || "",
        priceChange24h: processedData.tradeData.price_change_24h_percent,
        volumeChange24h: processedData.tradeData.volume_24h,
        trade_24h_change: processedData.tradeData.trade_24h_change_percent,
        liquidity: processedData.dexScreenerData.pairs[0]?.liquidity.usd || 0,
        liquidityChange24h: 0,
        holderChange24h:
          processedData.tradeData.unique_wallet_24h_change_percent,
        rugPull: false, // TODO: Implement rug pull detection
        isScam: false, // TODO: Implement scam detection
        marketCapChange24h: 0, // TODO: Implement market cap change
        sustainedGrowth: sustainedGrowth,
        rapidDump: isRapidDump,
        suspiciousVolume: suspiciousVolume,
        lastUpdated: new Date(),
      },
      recommenderMetrics: {
        recommenderId: recommenderId,
        overallTrustScore: recommenderMetrics.overallTrustScore,
        totalRecommendations: recommenderMetrics.totalRecommendations,
        successfulRecs: recommenderMetrics.successfulRecs,
        avgTokenPerformance: recommenderMetrics.avgTokenPerformance,
        riskScore: recommenderMetrics.riskScore,
        consistencyScore: recommenderMetrics.consistencyScore,
        lastUpdated: new Date(),
      },
    };
  }

  async updateRecommenderMetrics(
    recommenderId: string,
    tokenPerformance: TokenPerformance
  ): Promise<void> {
    const recommenderMetrics =
      await this.trustScoreDb.getRecommenderMetrics(recommenderId);

    const totalRecommendations = recommenderMetrics.totalRecommendations + 1;
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
    const newRecommenderMetrics: RecommenderMetrics = {
      recommenderId: recommenderId,
      overallTrustScore: overallTrustScore,
      totalRecommendations: totalRecommendations,
      successfulRecs: successfulRecs,
      avgTokenPerformance: avgTokenPerformance,
      riskScore: riskScore,
      consistencyScore: consistencyScore,
      lastUpdated: new Date(),
    };

    await this.trustScoreDb.updateRecommenderMetrics(recommenderMetrics);
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
}
