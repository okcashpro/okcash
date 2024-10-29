// src/adapters/sqlite/trustScoreDatabase.ts

import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { load } from "./sqlite/sqlite_vec.ts";

// Define interfaces
export interface Recommender {
  id: string; // UUID
  address: string;
  solanaPubkey?: string;
  telegramId?: string;
  discordId?: string;
  twitterId?: string;
  ip?: string;
}

export interface RecommenderMetrics {
  recommenderId: string;
  overallTrustScore: number;
  totalRecommendations: number;
  successfulRecs: number;
  avgTokenPerformance: number;
  riskScore: number;
  consistencyScore: number;
  lastUpdated: Date;
}

export interface TokenPerformance {
  tokenAddress: string;
  priceChange24h: number;
  volumeChange24h: number;
  trade_24h_change: number;
  liquidity: number;
  liquidityChange24h: number;
  holderChange24h: number;
  rugPull: boolean;
  isScam: boolean;
  marketCapChange24h: number;
  sustainedGrowth: boolean;
  rapidDump: boolean;
  suspiciousVolume: boolean;
  lastUpdated: Date;
}

export interface TokenRecommendation {
  id: string; // UUID
  recommenderId: string;
  tokenAddress: string;
  timestamp: Date;
  initialMarketCap?: number;
  initialLiquidity?: number;
  initialPrice?: number;
}
export interface RecommenderMetricsHistory {
  historyId: string; // UUID
  recommenderId: string;
  overallTrustScore: number;
  totalRecommendations: number;
  successfulRecs: number;
  avgTokenPerformance: number;
  riskScore: number;
  consistencyScore: number;
  recordedAt: Date;
}

interface RecommenderMetricsRow {
  recommender_id: string;
  overall_trust_score: number;
  total_recommendations: number;
  successful_recs: number;
  avg_token_performance: number;
  risk_score: number;
  consistency_score: number;
  last_updated: string;
}

interface TokenPerformanceRow {
  token_address: string;
  price_change_24h: number;
  volume_change_24h: number;
  trade_24h_change: number;
  liquidity: number;
  liquidity_change_24h: number;
  holder_change_24h: number;
  rug_pull: number;
  is_scam: number;
  market_cap_change24h: number;
  sustained_growth: number;
  rapid_dump: number;
  suspicious_volume: number;
  last_updated: string;
}

export class TrustScoreDatabase {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    load(db);
    // check if the tables exist, if not create them
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('recommenders', 'recommender_metrics', 'token_performance', 'token_recommendations', 'recommender_metrics_history');"
      )
      .all();
    if (tables.length !== 5) {
      this.initializeSchema();
    }
  }

  private initializeSchema() {
    // Enable Foreign Key Support
    this.db.exec(`PRAGMA foreign_keys = ON;`);

    // Create Recommenders Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS recommenders (
                id TEXT PRIMARY KEY,
                address TEXT UNIQUE NOT NULL,
                solana_pubkey TEXT UNIQUE,
                telegram_id TEXT UNIQUE,
                discord_id TEXT UNIQUE,
                twitter_id TEXT UNIQUE,
                ip TEXT
            );
        `);

    // Create RecommenderMetrics Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS recommender_metrics (
                recommender_id TEXT PRIMARY KEY,
                overall_trust_score REAL DEFAULT 0,
                total_recommendations INTEGER DEFAULT 0,
                successful_recs INTEGER DEFAULT 0,
                avg_token_performance REAL DEFAULT 0,
                risk_score REAL DEFAULT 0,
                consistency_score REAL DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
            );
        `);

    // Create TokenPerformance Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS token_performance (
                token_address TEXT PRIMARY KEY,
                price_change_24h REAL,
                volume_change_24h REAL,
                trade_24h_change REAL,
                liquidity REAL,
                liquidity_change_24h REAL,
                holder_change_24h REAL,
                rug_pull BOOLEAN DEFAULT FALSE,
                is_scam BOOLEAN DEFAULT FALSE,
                market_cap_change24h REAL,
                sustained_growth BOOLEAN DEFAULT FALSE,
                rapid_dump BOOLEAN DEFAULT FALSE,
                suspicious_volume BOOLEAN DEFAULT FALSE,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Create TokenRecommendations Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS token_recommendations (
                id TEXT PRIMARY KEY,
                recommender_id TEXT NOT NULL,
                token_address TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                initial_market_cap REAL,
                initial_liquidity REAL,
                initial_price REAL,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE,
                FOREIGN KEY (token_address) REFERENCES token_performance(token_address) ON DELETE CASCADE
            );
        `);

    // ----- Create RecommenderMetricsHistory Table -----
    this.db.exec(`
         CREATE TABLE IF NOT EXISTS recommender_metrics_history (
             history_id TEXT PRIMARY KEY,
             recommender_id TEXT NOT NULL,
             overall_trust_score REAL,
             total_recommendations INTEGER,
             successful_recs INTEGER,
             avg_token_performance REAL,
             risk_score REAL,
             consistency_score REAL,
             recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
         );
     `);
  }

  /**
   * Adds a new recommender to the database.
   * @param recommender Recommender object
   * @returns boolean indicating success
   */
  addRecommender(recommender: Recommender): string | null {
    const sql = `
            INSERT INTO recommenders (id, address, solana_pubkey, telegram_id, discord_id, twitter_id, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(address) DO NOTHING;
        `;
    try {
      const id = recommender.id || uuidv4();
      const result = this.db
        .prepare(sql)
        .run(
          id,
          recommender.address,
          recommender.solanaPubkey || null,
          recommender.telegramId || null,
          recommender.discordId || null,
          recommender.twitterId || null,
          recommender.ip || null
        );
      return result.changes > 0 ? id : null;
    } catch (error) {
      console.error("Error adding recommender:", error);
      return null;
    }
  }

  /**
   * Retrieves a recommender by any identifier.
   * @param identifier Any of the recommender's identifiers
   * @returns Recommender object or null
   */
  getRecommender(identifier: string): Recommender | null {
    const sql = `
            SELECT * FROM recommenders
            WHERE id = ? OR address = ? OR solana_pubkey = ? OR telegram_id = ? OR discord_id = ? OR twitter_id = ?;
        `;
    const recommender = this.db
      .prepare(sql)
      .get(
        identifier,
        identifier,
        identifier,
        identifier,
        identifier,
        identifier
      ) as Recommender | undefined;
    return recommender || null;
  }

  /**
   * Initializes metrics for a recommender if not present.
   * @param recommenderId Recommender's UUID
   */
  initializeRecommenderMetrics(recommenderId: string): boolean {
    const sql = `
            INSERT OR IGNORE INTO recommender_metrics (recommender_id)
            VALUES (?);
        `;
    try {
      const result = this.db.prepare(sql).run(recommenderId);
      return result.changes > 0;
    } catch (error) {
      console.error("Error initializing recommender metrics:", error);
      return false;
    }
  }

  /**
   * Retrieves metrics for a recommender.
   * @param recommenderId Recommender's UUID
   * @returns RecommenderMetrics object or null
   */
  getRecommenderMetrics(recommenderId: string): RecommenderMetrics | null {
    const sql = `SELECT * FROM recommender_metrics WHERE recommender_id = ?;`;
    const row = this.db.prepare(sql).get(recommenderId) as
      | RecommenderMetricsRow
      | undefined;
    if (!row) return null;

    return {
      recommenderId: row.recommender_id,
      overallTrustScore: row.overall_trust_score,
      totalRecommendations: row.total_recommendations,
      successfulRecs: row.successful_recs,
      avgTokenPerformance: row.avg_token_performance,
      riskScore: row.risk_score,
      consistencyScore: row.consistency_score,
      lastUpdated: new Date(row.last_updated),
    };
  }

  /**
   * Logs the current metrics of a recommender into the history table.
   * @param recommenderId Recommender's UUID
   */
  logRecommenderMetricsHistory(recommenderId: string): void {
    // Retrieve current metrics
    const currentMetrics = this.getRecommenderMetrics(recommenderId);
    if (!currentMetrics) {
      console.warn(`No metrics found for recommender ID: ${recommenderId}`);
      return;
    }

    // Create a history entry
    const history: RecommenderMetricsHistory = {
      historyId: uuidv4(),
      recommenderId: currentMetrics.recommenderId,
      overallTrustScore: currentMetrics.overallTrustScore,
      totalRecommendations: currentMetrics.totalRecommendations,
      successfulRecs: currentMetrics.successfulRecs,
      avgTokenPerformance: currentMetrics.avgTokenPerformance,
      riskScore: currentMetrics.riskScore,
      consistencyScore: currentMetrics.consistencyScore,
      recordedAt: new Date(), // Current timestamp
    };

    // Insert into recommender_metrics_history table
    const sql = `
            INSERT INTO recommender_metrics_history (
                history_id,
                recommender_id,
                overall_trust_score,
                total_recommendations,
                successful_recs,
                avg_token_performance,
                risk_score,
                consistency_score,
                recorded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
    try {
      this.db
        .prepare(sql)
        .run(
          history.historyId,
          history.recommenderId,
          history.overallTrustScore,
          history.totalRecommendations,
          history.successfulRecs,
          history.avgTokenPerformance,
          history.riskScore,
          history.consistencyScore,
          history.recordedAt.toISOString()
        );
      console.log(
        `Logged metrics history for recommender ID: ${recommenderId}`
      );
    } catch (error) {
      console.error("Error logging recommender metrics history:", error);
    }
  }

  /**
   * Updates metrics for a recommender.
   * @param metrics RecommenderMetrics object
   */
  updateRecommenderMetrics(metrics: RecommenderMetrics): void {
    // Log current metrics before updating
    this.logRecommenderMetricsHistory(metrics.recommenderId);

    const sql = `
            UPDATE recommender_metrics
            SET overall_trust_score = ?,
                total_recommendations = ?,
                successful_recs = ?,
                avg_token_performance = ?,
                risk_score = ?,
                consistency_score = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE recommender_id = ?;
        `;
    try {
      this.db
        .prepare(sql)
        .run(
          metrics.overallTrustScore,
          metrics.totalRecommendations,
          metrics.successfulRecs,
          metrics.avgTokenPerformance,
          metrics.riskScore,
          metrics.consistencyScore,
          metrics.recommenderId
        );
      console.log(
        `Updated metrics for recommender ID: ${metrics.recommenderId}`
      );
    } catch (error) {
      console.error("Error updating recommender metrics:", error);
    }
  }

  // ----- TokenPerformance Methods -----

  /**
   * Adds or updates token performance metrics.
   * @param performance TokenPerformance object
   */
  upsertTokenPerformance(performance: TokenPerformance): boolean {
    const sql = `
            INSERT INTO token_performance (
                token_address,
                price_change_24h,
                volume_change_24h,
                trade_24h_change,
                liquidity,
                liquidity_change_24h,
                holder_change_24h,
                rug_pull,
                is_scam,
                market_cap_change24h,
                sustained_growth,
                rapid_dump,
                suspicious_volume,
                last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(token_address) DO UPDATE SET
                price_change_24h = excluded.price_change_24h,
                volume_change_24h = excluded.volume_change_24h,
                trade_24h_change = excluded.trade_24h_change,
                liquidity = excluded.liquidity,
                liquidity_change_24h = excluded.liquidity_change_24h,
                holder_change_24h = excluded.holder_change_24h,
                rug_pull = excluded.rug_pull,
                is_scam = excluded.is_scam,
                market_cap_change24h = excluded.market_cap_change24h,
                sustained_growth = excluded.sustained_growth,
                rapid_dump = excluded.rapid_dump,
                suspicious_volume = excluded.suspicious_volume,
                last_updated = CURRENT_TIMESTAMP;
        `;
    try {
      this.db.prepare(sql).run(
        performance.tokenAddress,
        performance.priceChange24h,
        performance.volumeChange24h,
        performance.liquidityChange24h,
        performance.holderChange24h, // Ensure column name matches schema
        performance.rugPull ? 1 : 0,
        performance.isScam ? 1 : 0,
        performance.marketCapChange24h,
        performance.sustainedGrowth ? 1 : 0,
        performance.rapidDump ? 1 : 0,
        performance.suspiciousVolume ? 1 : 0
      );
      console.log(`Upserted token performance for ${performance.tokenAddress}`);
      return true;
    } catch (error) {
      console.error("Error upserting token performance:", error);
      return false;
    }
  }

  /**
   * Retrieves token performance metrics.
   * @param tokenAddress Token's address
   * @returns TokenPerformance object or null
   */
  getTokenPerformance(tokenAddress: string): TokenPerformance | null {
    const sql = `SELECT * FROM token_performance WHERE token_address = ?;`;
    const row = this.db.prepare(sql).get(tokenAddress) as
      | TokenPerformanceRow
      | undefined;
    if (!row) return null;

    return {
      tokenAddress: row.token_address,
      priceChange24h: row.price_change_24h,
      volumeChange24h: row.volume_change_24h,
      trade_24h_change: row.trade_24h_change,
      liquidity: row.liquidity,
      liquidityChange24h: row.liquidity_change_24h,
      holderChange24h: row.holder_change_24h,
      rugPull: row.rug_pull === 1,
      isScam: row.is_scam === 1,
      marketCapChange24h: row.market_cap_change24h,
      sustainedGrowth: row.sustained_growth === 1,
      rapidDump: row.rapid_dump === 1,
      suspiciousVolume: row.suspicious_volume === 1,
      lastUpdated: new Date(row.last_updated),
    };
  }

  // ----- TokenRecommendations Methods -----

  /**
   * Adds a new token recommendation.
   * @param recommendation TokenRecommendation object
   * @returns boolean indicating success
   */
  addTokenRecommendation(recommendation: TokenRecommendation): boolean {
    const sql = `
            INSERT INTO token_recommendations (
                id,
                recommender_id,
                token_address,
                timestamp,
                initial_market_cap,
                initial_liquidity,
                initial_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
    try {
      this.db
        .prepare(sql)
        .run(
          recommendation.id || uuidv4(),
          recommendation.recommenderId,
          recommendation.tokenAddress,
          recommendation.timestamp || new Date(),
          recommendation.initialMarketCap || null,
          recommendation.initialLiquidity || null,
          recommendation.initialPrice || null
        );
      return true;
    } catch (error) {
      console.error("Error adding token recommendation:", error);
      return false;
    }
  }

  /**
   * Retrieves all recommendations made by a recommender.
   * @param recommenderId Recommender's UUID
   * @returns Array of TokenRecommendation objects
   */
  getRecommendationsByRecommender(
    recommenderId: string
  ): TokenRecommendation[] {
    const sql = `SELECT * FROM token_recommendations WHERE recommender_id = ? ORDER BY timestamp DESC;`;
    const rows = this.db.prepare(sql).all(recommenderId) as Array<{
      id: string;
      recommender_id: string;
      token_address: string;
      timestamp: string;
      initial_market_cap: number | null;
      initial_liquidity: number | null;
      initial_price: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      recommenderId: row.recommender_id,
      tokenAddress: row.token_address,
      timestamp: new Date(row.timestamp),
      initialMarketCap: row.initial_market_cap,
      initialLiquidity: row.initial_liquidity,
      initialPrice: row.initial_price,
    }));
  }

  /**
   * Retrieves all recommendations for a specific token.
   * @param tokenAddress Token's address
   * @returns Array of TokenRecommendation objects
   */
  getRecommendationsByToken(tokenAddress: string): TokenRecommendation[] {
    const sql = `SELECT * FROM token_recommendations WHERE token_address = ? ORDER BY timestamp DESC;`;
    const rows = this.db.prepare(sql).all(tokenAddress) as Array<{
      id: string;
      recommender_id: string;
      token_address: string;
      timestamp: string;
      initial_market_cap: number | null;
      initial_liquidity: number | null;
      initial_price: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      recommenderId: row.recommender_id,
      tokenAddress: row.token_address,
      timestamp: new Date(row.timestamp),
      initialMarketCap: row.initial_market_cap ?? undefined,
      initialLiquidity: row.initial_liquidity ?? undefined,
      initialPrice: row.initial_price ?? undefined,
    }));
  }

  /**
   * Retrieves all recommendations within a specific timeframe.
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of TokenRecommendation objects
   */
  getRecommendationsByDateRange(
    startDate: Date,
    endDate: Date
  ): TokenRecommendation[] {
    const sql = `
            SELECT * FROM token_recommendations
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC;
        `;
    const rows = this.db
      .prepare(sql)
      .all(startDate.toISOString(), endDate.toISOString()) as Array<{
      id: string;
      recommender_id: string;
      token_address: string;
      timestamp: string;
      initial_market_cap: number | null;
      initial_liquidity: number | null;
      initial_price: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      recommenderId: row.recommender_id,
      tokenAddress: row.token_address,
      timestamp: new Date(row.timestamp),
      initialMarketCap: row.initial_market_cap ?? undefined,
      initialLiquidity: row.initial_liquidity ?? undefined,
      initialPrice: row.initial_price ?? undefined,
    }));
  }

  /**
   * Retrieves historical metrics for a recommender.
   * @param recommenderId Recommender's UUID
   * @returns Array of RecommenderMetricsHistory objects
   */
  getRecommenderMetricsHistory(
    recommenderId: string
  ): RecommenderMetricsHistory[] {
    const sql = `
          SELECT * FROM recommender_metrics_history
          WHERE recommender_id = ?
          ORDER BY recorded_at DESC;
      `;
    const rows = this.db.prepare(sql).all(recommenderId) as Array<{
      history_id: string;
      recommender_id: string;
      overall_trust_score: number;
      total_recommendations: number;
      successful_recs: number;
      avg_token_performance: number;
      risk_score: number;
      consistency_score: number;
      recorded_at: string;
    }>;

    return rows.map((row) => ({
      historyId: row.history_id,
      recommenderId: row.recommender_id,
      overallTrustScore: row.overall_trust_score,
      totalRecommendations: row.total_recommendations,
      successfulRecs: row.successful_recs,
      avgTokenPerformance: row.avg_token_performance,
      riskScore: row.risk_score,
      consistencyScore: row.consistency_score,
      recordedAt: new Date(row.recorded_at),
    }));
  }

  /**
   * Close the database connection gracefully.
   */
  closeConnection(): void {
    this.db.close();
  }
}
