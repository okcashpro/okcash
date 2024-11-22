import { v4 } from "uuid";
import pg, { type Pool } from "pg";
import {
    Account,
    Actor,
    GoalStatus,
    type Goal,
    type Memory,
    type Relationship,
    type UUID,
    type IDatabaseCacheAdapter,
    Participant,
    DatabaseAdapter,
    elizaLogger,
} from "@ai16z/eliza";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export class PostgresDatabaseAdapter
    extends DatabaseAdapter<Pool>
    implements IDatabaseCacheAdapter
{
    private pool: Pool;

    constructor(connectionConfig: any) {
        super();

        const defaultConfig = {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new pg.Pool({
            ...defaultConfig,
            ...connectionConfig, // Allow overriding defaults
        });

        this.pool.on("error", async (err) => {
            elizaLogger.error("Unexpected error on idle client", err);

            // Attempt to reconnect with exponential backoff
            let retryCount = 0;
            const maxRetries = 5;
            const baseDelay = 1000; // Start with 1 second delay

            while (retryCount < maxRetries) {
                try {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    elizaLogger.log(`Attempting to reconnect in ${delay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    // Create new pool with same config
                    this.pool = new pg.Pool(this.pool.options);
                    await this.testConnection();

                    elizaLogger.log("Successfully reconnected to database");
                    return;
                } catch (error) {
                    retryCount++;
                    elizaLogger.error(
                        `Reconnection attempt ${retryCount} failed:`,
                        error
                    );
                }
            }

            elizaLogger.error(
                `Failed to reconnect after ${maxRetries} attempts`
            );
            throw new Error("Database connection lost and unable to reconnect");
        });
    }

    async init() {
        await this.testConnection();

        try {
            const client = await this.pool.connect();
            const schema = fs.readFileSync(
                path.resolve(__dirname, "../schema.sql"),
                "utf8"
            );
            await client.query(schema);
        } catch (error) {
            elizaLogger.error(error);
            throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        let client;
        try {
            client = await this.pool.connect();
            const result = await client.query("SELECT NOW()");
            elizaLogger.log(
                "Database connection test successful:",
                result.rows[0]
            );
            return true;
        } catch (error) {
            elizaLogger.error("Database connection test failed:", error);
            throw new Error(`Failed to connect to database: ${error.message}`);
        } finally {
            if (client) client.release();
        }
    }

    async getRoom(roomId: UUID): Promise<UUID | null> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                "SELECT id FROM rooms WHERE id = $1",
                [roomId]
            );
            return rows.length > 0 ? (rows[0].id as UUID) : null;
        } finally {
            client.release();
        }
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT id, "userId", "roomId", "last_message_read" 
                FROM participants 
                WHERE "userId" = $1`,
                [userId]
            );
            return rows as Participant[];
        } finally {
            client.release();
        }
    }

    async getParticipantUserState(
        roomId: UUID,
        userId: UUID
    ): Promise<"FOLLOWED" | "MUTED" | null> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT "userState" FROM participants WHERE "roomId" = $1 AND "userId" = $2`,
                [roomId, userId]
            );
            return rows.length > 0 ? rows[0].userState : null;
        } finally {
            client.release();
        }
    }

    async getMemoriesByRoomIds(params: {
        roomIds: UUID[];
        agentId?: UUID;
        tableName: string;
    }): Promise<Memory[]> {
        const client = await this.pool.connect();
        try {
            if (params.roomIds.length === 0) return [];
            const placeholders = params.roomIds
                .map((_, i) => `$${i + 2}`)
                .join(", ");

            let query = `SELECT * FROM memories WHERE type = $1 AND "roomId" IN (${placeholders})`;
            let queryParams = [params.tableName, ...params.roomIds];

            if (params.agentId) {
                query += ` AND "agentId" = $${params.roomIds.length + 2}`;
                queryParams = [...queryParams, params.agentId];
            }

            const { rows } = await client.query(query, queryParams);
            return rows.map((row) => ({
                ...row,
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
            }));
        } finally {
            client.release();
        }
    }

    async setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `UPDATE participants SET "userState" = $1 WHERE "roomId" = $2 AND "userId" = $3`,
                [state, roomId, userId]
            );
        } finally {
            client.release();
        }
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                'SELECT "userId" FROM participants WHERE "roomId" = $1',
                [roomId]
            );
            return rows.map((row) => row.userId);
        } finally {
            client.release();
        }
    }

    async getAccountById(userId: UUID): Promise<Account | null> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                "SELECT * FROM accounts WHERE id = $1",
                [userId]
            );
            if (rows.length === 0) return null;

            const account = rows[0];
            // elizaLogger.log("account", account);
            return {
                ...account,
                details:
                    typeof account.details === "string"
                        ? JSON.parse(account.details)
                        : account.details,
            };
        } finally {
            client.release();
        }
    }

    async createAccount(account: Account): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO accounts (id, name, username, email, "avatarUrl", details)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    account.id ?? v4(),
                    account.name,
                    account.username || "",
                    account.email || "",
                    account.avatarUrl || "",
                    JSON.stringify(account.details),
                ]
            );
            return true;
        } catch (error) {
            elizaLogger.log("Error creating account", error);
            return false;
        } finally {
            client.release();
        }
    }

    async getActorById(params: { roomId: UUID }): Promise<Actor[]> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT a.id, a.name, a.username, a.details
                FROM participants p
                LEFT JOIN accounts a ON p."userId" = a.id
                WHERE p."roomId" = $1`,
                [params.roomId]
            );
            return rows.map((row) => ({
                ...row,
                details:
                    typeof row.details === "string"
                        ? JSON.parse(row.details)
                        : row.details,
            }));
        } finally {
            client.release();
        }
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                "SELECT * FROM memories WHERE id = $1",
                [id]
            );
            if (rows.length === 0) return null;

            return {
                ...rows[0],
                content:
                    typeof rows[0].content === "string"
                        ? JSON.parse(rows[0].content)
                        : rows[0].content,
            };
        } finally {
            client.release();
        }
    }

    async createMemory(memory: Memory, tableName: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            let isUnique = true;
            if (memory.embedding) {
                const similarMemories = await this.searchMemoriesByEmbedding(
                    memory.embedding,
                    {
                        tableName,
                        roomId: memory.roomId,
                        match_threshold: 0.95,
                        count: 1,
                    }
                );
                isUnique = similarMemories.length === 0;
            }

            await client.query(
                `INSERT INTO memories (
                    id, type, content, embedding, "userId", "roomId", "agentId", "unique", "createdAt"
                ) VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::uuid, $8, to_timestamp($9/1000.0))`,
                [
                    memory.id ?? v4(),
                    tableName,
                    JSON.stringify(memory.content),
                    memory.embedding ? `[${memory.embedding.join(",")}]` : null,
                    memory.userId,
                    memory.roomId,
                    memory.agentId,
                    memory.unique ?? isUnique,
                    Date.now(),
                ]
            );
        } finally {
            client.release();
        }
    }

    async searchMemories(params: {
        tableName: string;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]> {
        return await this.searchMemoriesByEmbedding(params.embedding, {
            match_threshold: params.match_threshold,
            count: params.match_count,
            roomId: params.roomId,
            unique: params.unique,
            tableName: params.tableName,
        });
    }

    async getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]> {
        if (!params.tableName) throw new Error("tableName is required");
        if (!params.roomId) throw new Error("roomId is required");

        const client = await this.pool.connect();
        try {
            let sql = `SELECT * FROM memories WHERE type = $1 AND "roomId" = $2`;
            const values: any[] = [params.tableName, params.roomId];
            let paramCount = 2;

            if (params.start) {
                paramCount++;
                sql += ` AND "createdAt" >= to_timestamp($${paramCount})`;
                values.push(params.start / 1000);
            }

            if (params.end) {
                paramCount++;
                sql += ` AND "createdAt" <= to_timestamp($${paramCount})`;
                values.push(params.end / 1000);
            }

            if (params.unique) {
                sql += ` AND "unique" = true`;
            }

            if (params.agentId) {
                paramCount++;
                sql += ` AND "agentId" = $${paramCount}`;
                values.push(params.agentId);
            }

            sql += ' ORDER BY "createdAt" DESC';

            if (params.count) {
                paramCount++;
                sql += ` LIMIT $${paramCount}`;
                values.push(params.count);
            }

            const { rows } = await client.query(sql, values);
            return rows.map((row) => ({
                ...row,
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
            }));
        } finally {
            client.release();
        }
    }

    async getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]> {
        const client = await this.pool.connect();
        try {
            let sql = `SELECT * FROM goals WHERE "roomId" = $1`;
            const values: any[] = [params.roomId];
            let paramCount = 1;

            if (params.userId) {
                paramCount++;
                sql += ` AND "userId" = $${paramCount}`;
                values.push(params.userId);
            }

            if (params.onlyInProgress) {
                sql += " AND status = 'IN_PROGRESS'";
            }

            if (params.count) {
                paramCount++;
                sql += ` LIMIT $${paramCount}`;
                values.push(params.count);
            }

            const { rows } = await client.query(sql, values);
            return rows.map((row) => ({
                ...row,
                objectives:
                    typeof row.objectives === "string"
                        ? JSON.parse(row.objectives)
                        : row.objectives,
            }));
        } finally {
            client.release();
        }
    }

    async updateGoal(goal: Goal): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `UPDATE goals SET name = $1, status = $2, objectives = $3 WHERE id = $4`,
                [
                    goal.name,
                    goal.status,
                    JSON.stringify(goal.objectives),
                    goal.id,
                ]
            );
        } finally {
            client.release();
        }
    }

    async createGoal(goal: Goal): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO goals (id, "roomId", "userId", name, status, objectives)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    goal.id ?? v4(),
                    goal.roomId,
                    goal.userId,
                    goal.name,
                    goal.status,
                    JSON.stringify(goal.objectives),
                ]
            );
        } finally {
            client.release();
        }
    }

    async removeGoal(goalId: UUID): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query("DELETE FROM goals WHERE id = $1", [goalId]);
        } finally {
            client.release();
        }
    }

    async createRoom(roomId?: UUID): Promise<UUID> {
        const client = await this.pool.connect();
        try {
            const newRoomId = roomId || v4();
            await client.query("INSERT INTO rooms (id) VALUES ($1)", [
                newRoomId,
            ]);
            return newRoomId as UUID;
        } finally {
            client.release();
        }
    }

    async removeRoom(roomId: UUID): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
        } finally {
            client.release();
        }
    }

    async createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean> {
        if (!params.userA || !params.userB) {
            throw new Error("userA and userB are required");
        }

        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO relationships (id, "userA", "userB", "userId")
                VALUES ($1, $2, $3, $4)`,
                [v4(), params.userA, params.userB, params.userA]
            );
            return true;
        } catch (error) {
            console.log("Error creating relationship", error);
            return false;
        } finally {
            client.release();
        }
    }

    async getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT * FROM relationships 
                WHERE ("userA" = $1 AND "userB" = $2) OR ("userA" = $2 AND "userB" = $1)`,
                [params.userA, params.userB]
            );
            return rows.length > 0 ? rows[0] : null;
        } finally {
            client.release();
        }
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT * FROM relationships WHERE "userA" = $1 OR "userB" = $1`,
                [params.userId]
            );
            return rows;
        } finally {
            client.release();
        }
    }

    async getCachedEmbeddings(opts: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
        const client = await this.pool.connect();
        try {
            // Get the JSON field content as text first
            const sql = `
                WITH content_text AS (
                    SELECT 
                        embedding,
                        COALESCE(
                            content->$2->>$3,
                            ''
                        ) as content_text
                    FROM memories 
                    WHERE type = $4
                    AND content->$2->>$3 IS NOT NULL
                )
                SELECT 
                    embedding,
                    levenshtein(
                        $1,
                        content_text
                    ) as levenshtein_score
                FROM content_text
                ORDER BY levenshtein_score
                LIMIT $5
            `;

            const { rows } = await client.query(sql, [
                opts.query_input,
                opts.query_field_name,
                opts.query_field_sub_name,
                opts.query_table_name,
                opts.query_match_count,
            ]);

            return rows.map((row) => ({
                embedding: row.embedding,
                levenshtein_score: row.levenshtein_score,
            }));
        } catch (error) {
            console.error("Error in getCachedEmbeddings:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    async log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO logs (body, "userId", "roomId", type) 
                VALUES ($1, $2, $3, $4)`,
                [params.body, params.userId, params.roomId, params.type]
            );
        } finally {
            client.release();
        }
    }

    async searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            agentId?: UUID;
            roomId?: UUID;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]> {
        const client = await this.pool.connect();
        try {
            const vectorStr = `[${embedding.join(",")}]`;

            let sql = `
                SELECT *,
                1 - (embedding <-> $1::vector) as similarity
                FROM memories
                WHERE type = $2
            `;

            const values: any[] = [vectorStr, params.tableName];
            let paramCount = 2;

            if (params.unique) {
                sql += ` AND "unique" = true`;
            }

            if (params.agentId) {
                paramCount++;
                sql += ` AND "agentId" = $${paramCount}`;
                values.push(params.agentId);
            }

            if (params.roomId) {
                paramCount++;
                sql += ` AND "roomId" = $${paramCount}::uuid`;
                values.push(params.roomId);
            }

            if (params.match_threshold) {
                paramCount++;
                sql += ` AND 1 - (embedding <-> $1::vector) >= $${paramCount}`;
                values.push(params.match_threshold);
            }

            sql += ` ORDER BY embedding <-> $1::vector`;

            if (params.count) {
                paramCount++;
                sql += ` LIMIT $${paramCount}`;
                values.push(params.count);
            }

            const { rows } = await client.query(sql, values);
            return rows.map((row) => ({
                ...row,
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                similarity: row.similarity,
            }));
        } finally {
            client.release();
        }
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO participants (id, "userId", "roomId") 
                VALUES ($1, $2, $3)`,
                [v4(), userId, roomId]
            );
            return true;
        } catch (error) {
            console.log("Error adding participant", error);
            return false;
        } finally {
            client.release();
        }
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `DELETE FROM participants WHERE "userId" = $1 AND "roomId" = $2`,
                [userId, roomId]
            );
            return true;
        } catch (error) {
            console.log("Error removing participant", error);
            return false;
        } finally {
            client.release();
        }
    }

    async updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query("UPDATE goals SET status = $1 WHERE id = $2", [
                params.status,
                params.goalId,
            ]);
        } finally {
            client.release();
        }
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                "DELETE FROM memories WHERE type = $1 AND id = $2",
                [tableName, memoryId]
            );
        } finally {
            client.release();
        }
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `DELETE FROM memories WHERE type = $1 AND "roomId" = $2`,
                [tableName, roomId]
            );
        } finally {
            client.release();
        }
    }

    async countMemories(
        roomId: UUID,
        unique = true,
        tableName = ""
    ): Promise<number> {
        if (!tableName) throw new Error("tableName is required");

        const client = await this.pool.connect();
        try {
            let sql = `SELECT COUNT(*) as count FROM memories WHERE type = $1 AND "roomId" = $2`;
            if (unique) {
                sql += ` AND "unique" = true`;
            }

            const { rows } = await client.query(sql, [tableName, roomId]);
            return parseInt(rows[0].count);
        } finally {
            client.release();
        }
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(`DELETE FROM goals WHERE "roomId" = $1`, [
                roomId,
            ]);
        } finally {
            client.release();
        }
    }

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT "roomId" FROM participants WHERE "userId" = $1`,
                [userId]
            );
            return rows.map((row) => row.roomId);
        } finally {
            client.release();
        }
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        const client = await this.pool.connect();
        try {
            const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
            const { rows } = await client.query(
                `SELECT DISTINCT "roomId" FROM participants WHERE "userId" IN (${placeholders})`,
                userIds
            );
            return rows.map((row) => row.roomId);
        } finally {
            client.release();
        }
    }

    async getActorDetails(params: { roomId: string }): Promise<Actor[]> {
        const sql = `
            SELECT 
                a.id,
                a.name,
                a.username,
                COALESCE(a.details::jsonb, '{}'::jsonb) as details
            FROM participants p
            LEFT JOIN accounts a ON p."userId" = a.id
            WHERE p."roomId" = $1
        `;

        try {
            const result = await this.pool.query<Actor>(sql, [params.roomId]);
            return result.rows.map((row) => ({
                ...row,
                details: row.details, // PostgreSQL automatically handles JSON parsing
            }));
        } catch (error) {
            console.error("Error fetching actor details:", error);
            throw new Error("Failed to fetch actor details");
        }
    }

    async getCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<string | undefined> {
        const client = await this.pool.connect();
        try {
            const sql = `SELECT "value"::TEXT FROM cache WHERE "key" = $1 AND "agentId" = $2`;
            const { rows } = await this.pool.query<{ value: string }>(sql, [
                params.key,
                params.agentId,
            ]);

            return rows[0]?.value ?? undefined;
        } catch (error) {
            console.log("Error fetching cache", error);
        } finally {
            client.release();
        }
    }

    async setCache(params: {
        key: string;
        agentId: UUID;
        value: string;
    }): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO cache ("key", "agentId", "value", "createdAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT ("key", "agentId")
                    DO UPDATE SET "value" = EXCLUDED.value, "createdAt" = CURRENT_TIMESTAMP`,
                [params.key, params.agentId, params.value]
            );
            return true;
        } catch (error) {
            console.log("Error adding cache", error);
        } finally {
            client.release();
        }
    }

    async deleteCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `DELETE FROM cache WHERE "key" = $1 AND "agentId" = $2`,
                [params.key, params.agentId]
            );
            return true;
        } catch (error) {
            console.log("Error adding cache", error);
        } finally {
            client.release();
        }
    }
}

export default PostgresDatabaseAdapter;
