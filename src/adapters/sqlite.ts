import { v4 } from "uuid";

import { DatabaseAdapter } from "../core/database.ts";
import {
  Account,
  Actor,
  GoalStatus,
  type Goal,
  type Memory,
  type Relationship,
  type UUID,
  Participant,
} from "../core/types.ts";

import { sqliteTables } from "./sqlite/sqliteTables.ts";

import { Database } from "better-sqlite3";

export class SqliteDatabaseAdapter extends DatabaseAdapter {
  async getRoom(room_id: UUID): Promise<UUID | null> {
    const sql = "SELECT id FROM rooms WHERE id = ?";
    const room = this.db.prepare(sql).get(room_id) as
      | { id: string }
      | undefined;
    return room ? (room.id as UUID) : null;
  }

  async getParticipantsForAccount(user_id: UUID): Promise<Participant[]> {
    const sql = `
      SELECT p.id, p.user_id, p.room_id, p.last_message_read
      FROM participants p
      WHERE p.user_id = ?
    `;
    const rows = this.db.prepare(sql).all(user_id) as Participant[];
    return rows;
  }

  async getParticipantsForRoom(room_id: UUID): Promise<UUID[]> {
    const sql = "SELECT user_id FROM participants WHERE room_id = ?";
    const rows = this.db.prepare(sql).all(room_id) as { user_id: string }[];
    return rows.map((row) => row.user_id as UUID);
  }

  async getParticipantUserState(roomId: UUID, userId: UUID): Promise<'FOLLOWED' | 'MUTED' | null> {
    const stmt = this.db.prepare('SELECT user_state FROM participants WHERE room_id = ? AND user_id = ?');
    const res = stmt.get(roomId, userId) as { user_state: 'FOLLOWED' | 'MUTED' | null } | undefined;
    return res?.user_state ?? null;
  }

  async setParticipantUserState(roomId: UUID, userId: UUID, state: 'FOLLOWED' | 'MUTED' | null): Promise<void> {
    const stmt = this.db.prepare('UPDATE participants SET user_state = ? WHERE room_id = ? AND user_id = ?');
    stmt.run(state, roomId, userId);
  }

  db: Database;

  constructor(db: Database) {
    super();
    this.db = db;

    // Check if the 'accounts' table exists as a representative table
    const tableExists = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'",
      )
      .get();

    if (!tableExists) {
      // If the 'accounts' table doesn't exist, create all the tables
      this.db.exec(sqliteTables);
    }
  }

  async getAccountById(user_id: UUID): Promise<Account | null> {
    const sql = "SELECT * FROM accounts WHERE id = ?";
    const accounts = this.db.prepare(sql).get(user_id) as Account[];
    const account = accounts && accounts[0];
    if (account) {
      if (typeof account.details === "string") {
        account.details = JSON.parse(account.details as unknown as string);
      }
    }
    return account || null;
  }

  async createAccount(account: Account): Promise<boolean> {
    try {
      const sql =
        "INSERT INTO accounts (id, name, email, avatar_url, details) VALUES (?, ?, ?, ?, ?)";
      this.db
        .prepare(sql)
        .run(
          account.id ?? v4(),
          account.name,
          account.email,
          account.avatar_url,
          JSON.stringify(account.details),
        );
      return true;
    } catch (error) {
      console.log("Error creating account", error);
      return false;
    }
  }

  async getActorDetails(params: { room_id: UUID }): Promise<Actor[]> {
    const sql = `
      SELECT a.id, a.name, a.details
      FROM participants p
      LEFT JOIN accounts a ON p.user_id = a.id
      WHERE p.room_id = ?
    `;
    const rows = this.db.prepare(sql).all(params.room_id) as (Actor | null)[];

    return rows
      .map((row) => {
        if (row === null) {
          return null;
        }
        return {
          ...row,
          details:
            typeof row.details === "string"
              ? JSON.parse(row.details)
              : row.details,
        };
      })
      .filter((row): row is Actor => row !== null);
  }

  async createMemory(memory: Memory, tableName: string): Promise<void> {
    console.log("*** createMemory ***");
    console.log(memory);
    console.log(memory.content?.attachments);
    let isUnique = true;
    if (memory.embedding) {
      // Check if a similar memory already exists
      const similarMemories = await this.searchMemoriesByEmbedding(
        memory.embedding,
        {
          tableName,
          room_id: memory.room_id,
          match_threshold: 0.95, // 5% similarity threshold
          count: 1,
        },
      );

      isUnique = similarMemories.length === 0;
    }

    const content = JSON.stringify(memory.content);

    console.log("Memory being written");
    console.log(content);

    console.log("memory");
    console.log(memory.content);

    // Insert the memory with the appropriate 'unique' value
    const sql = `INSERT INTO memories (id, type, content, embedding, user_id, room_id, \`unique\`) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    this.db
      .prepare(sql)
      .run(
        v4(),
        tableName,
        content,
        JSON.stringify(memory.embedding),
        memory.user_id,
        memory.room_id,
        isUnique ? 1 : 0,
      );
  }

  async searchMemories(params: {
    tableName: string;
    room_id: UUID;
    embedding: number[];
    match_threshold: number;
    match_count: number;
    unique: boolean;
  }): Promise<Memory[]> {
    let sql = `
SELECT *, (1 - vss_distance_l2(embedding, ?)) AS similarity
FROM memories
WHERE type = ?
AND room_id = ?`;

    if (params.unique) {
      sql += " AND `unique` = 1";
    }

    sql += ` ORDER BY similarity DESC LIMIT ?`;
    const queryParams = [
      JSON.stringify(params.embedding),
      params.tableName,
      params.room_id,
      params.match_count,
    ];

    const memories = this.db.prepare(sql).all(...queryParams) as (Memory & {
      similarity: number;
    })[];
    return memories.map((memory) => ({
      ...memory,
      content: JSON.parse(memory.content as unknown as string),
    }));
  }

  async searchMemoriesByEmbedding(
    embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      room_id?: UUID;
      unique?: boolean;
      tableName: string;
    },
  ): Promise<Memory[]> {
    const queryParams = [
      JSON.stringify(embedding),
      params.tableName,
      // JSON.stringify(embedding),
    ];

    let sql = `
      SELECT *, (1 - vss_distance_l2(embedding, ?)) AS similarity
      FROM memories
      WHERE type = ?`; // AND vss_search(embedding, ?)

    if (params.unique) {
      sql += " AND `unique` = 1";
    }
    if (params.room_id) {
      sql += " AND room_id = ?";
      queryParams.push(params.room_id);
    }
    sql += ` ORDER BY similarity DESC`;

    if (params.count) {
      sql += " LIMIT ?";
      queryParams.push(params.count.toString());
    }

    const memories = this.db.prepare(sql).all(...queryParams) as (Memory & {
      similarity: number;
    })[];
    return memories.map((memory) => ({
      ...memory,
      content: JSON.parse(memory.content as unknown as string),
    }));
  }

  async getCachedEmbeddings(opts: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<
    {
      embedding: number[];
      levenshtein_score: number;
    }[]
  > {
    const sql = `
      SELECT *
      FROM memories
      WHERE type = ?
      AND vss_search(${opts.query_field_name}, ?)
      ORDER BY vss_search(${opts.query_field_name}, ?) DESC
      LIMIT ?
    `;
    const memories = this.db
      .prepare(sql)
      .all(
        opts.query_table_name,
        opts.query_input,
        opts.query_input,
        opts.query_match_count,
      ) as Memory[];

    return memories.map((memory) => ({
      embedding: JSON.parse(memory.embedding as unknown as string),
      levenshtein_score: 0,
    }));
  }

  async updateGoalStatus(params: {
    goalId: UUID;
    status: GoalStatus;
  }): Promise<void> {
    const sql = "UPDATE goals SET status = ? WHERE id = ?";
    this.db.prepare(sql).run(params.status, params.goalId);
  }

  async log(params: {
    body: { [key: string]: unknown };
    user_id: UUID;
    room_id: UUID;
    type: string;
  }): Promise<void> {
    const sql =
      "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)";
    this.db
      .prepare(sql)
      .run(
        JSON.stringify(params.body),
        params.user_id,
        params.room_id,
        params.type,
      );
  }

  async getMemories(params: {
    room_id: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
  }): Promise<Memory[]> {
    if (!params.tableName) {
      throw new Error("tableName is required");
    }
    if (!params.room_id) {
      throw new Error("room_id is required");
    }
    let sql = `SELECT * FROM memories WHERE type = ? AND room_id = ?`;

    const queryParams = [params.tableName, params.room_id];

    if (params.unique) {
      sql += " AND `unique` = 1";
    }

    // get the most recent memories
    sql += " ORDER BY created_at DESC";

    if (params.count) {
      sql += " LIMIT ?";
      queryParams.push(params.count.toString());
    }

    const memories = this.db.prepare(sql).all(...queryParams) as Memory[];

    return memories.map((memory) => ({
      ...memory,
      content: JSON.parse(memory.content as unknown as string),
    }));
  }

  async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
    const sql = `DELETE FROM memories WHERE type = ? AND id = ?`;
    this.db.prepare(sql).run(tableName, memoryId);
  }

  async removeAllMemories(room_id: UUID, tableName: string): Promise<void> {
    const sql = `DELETE FROM memories WHERE type = ? AND room_id = ?`;
    this.db.prepare(sql).run(tableName, room_id);
  }

  async countMemories(
    room_id: UUID,
    unique = true,
    tableName = "",
  ): Promise<number> {
    if (!tableName) {
      throw new Error("tableName is required");
    }

    let sql = `SELECT COUNT(*) as count FROM memories WHERE type = ? AND room_id = ?`;
    const queryParams = [tableName, room_id] as string[];

    if (unique) {
      sql += " AND `unique` = 1";
    }

    return (this.db.prepare(sql).get(...queryParams) as { count: number })
      .count;
  }

  async getGoals(params: {
    room_id: UUID;
    user_id?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]> {
    let sql = "SELECT * FROM goals WHERE room_id = ?";
    const queryParams = [params.room_id];

    if (params.user_id) {
      sql += " AND user_id = ?";
      queryParams.push(params.user_id);
    }

    if (params.onlyInProgress) {
      sql += " AND status = 'IN_PROGRESS'";
    }

    if (params.count) {
      sql += " LIMIT ?";
      // @ts-expect-error - queryParams is an array of strings
      queryParams.push(params.count.toString());
    }

    const goals = this.db.prepare(sql).all(...queryParams) as Goal[];
    return goals.map((goal) => ({
      ...goal,
      objectives:
        typeof goal.objectives === "string"
          ? JSON.parse(goal.objectives)
          : goal.objectives,
    }));
  }

  async updateGoal(goal: Goal): Promise<void> {
    const sql =
      "UPDATE goals SET name = ?, status = ?, objectives = ? WHERE id = ?";
    this.db
      .prepare(sql)
      .run(goal.name, goal.status, JSON.stringify(goal.objectives), goal.id);
  }

  async createGoal(goal: Goal): Promise<void> {
    const sql =
      "INSERT INTO goals (id, room_id, user_id, name, status, objectives) VALUES (?, ?, ?, ?, ?, ?)";
    this.db
      .prepare(sql)
      .run(
        goal.id ?? v4(),
        goal.room_id,
        goal.user_id,
        goal.name,
        goal.status,
        JSON.stringify(goal.objectives),
      );
  }

  async removeGoal(goalId: UUID): Promise<void> {
    const sql = "DELETE FROM goals WHERE id = ?";
    this.db.prepare(sql).run(goalId);
  }

  async removeAllGoals(room_id: UUID): Promise<void> {
    const sql = "DELETE FROM goals WHERE room_id = ?";
    this.db.prepare(sql).run(room_id);
  }

  async createRoom(room_id?: UUID): Promise<UUID> {
    room_id = room_id || (v4() as UUID);
    try {
      const sql = "INSERT INTO rooms (id) VALUES (?)";
      this.db.prepare(sql).run(room_id ?? (v4() as UUID));
    } catch (error) {
      console.log("Error creating room", error);
    }
    return room_id as UUID;
  }

  async removeRoom(room_id: UUID): Promise<void> {
    const sql = "DELETE FROM rooms WHERE id = ?";
    this.db.prepare(sql).run(room_id);
  }

  async getRoomsForParticipant(user_id: UUID): Promise<UUID[]> {
    const sql = "SELECT room_id FROM participants WHERE user_id = ?";
    const rows = this.db.prepare(sql).all(user_id) as { room_id: string }[];
    return rows.map((row) => row.room_id as UUID);
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    // Assuming userIds is an array of UUID strings, prepare a list of placeholders
    const placeholders = userIds.map(() => "?").join(", ");
    // Construct the SQL query with the correct number of placeholders
    const sql = `SELECT DISTINCT room_id FROM participants WHERE user_id IN (${placeholders})`;
    // Execute the query with the userIds array spread into arguments
    const rows = this.db.prepare(sql).all(...userIds) as { room_id: string }[];
    // Map and return the room_id values as UUIDs
    return rows.map((row) => row.room_id as UUID);
  }

  async addParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    try {
      const sql =
        "INSERT INTO participants (id, user_id, room_id) VALUES (?, ?, ?)";
      this.db.prepare(sql).run(v4(), user_id, room_id);
      return true;
    } catch (error) {
      console.log("Error adding participant", error);
      return false;
    }
  }

  async removeParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    try {
      const sql = "DELETE FROM participants WHERE user_id = ? AND room_id = ?";
      this.db.prepare(sql).run(user_id, room_id);
      return true;
    } catch (error) {
      console.log("Error removing participant", error);
      return false;
    }
  }

  async createRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<boolean> {
    if (!params.userA || !params.userB) {
      throw new Error("userA and userB are required");
    }
    const sql =
      "INSERT INTO relationships (id, user_a, user_b, user_id) VALUES (?, ?, ?, ?)";
    this.db.prepare(sql).run(v4(), params.userA, params.userB, params.userA);
    return true;
  }

  async getRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<Relationship | null> {
    const sql =
      "SELECT * FROM relationships WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)";
    return (
      (this.db
        .prepare(sql)
        .get(
          params.userA,
          params.userB,
          params.userB,
          params.userA,
        ) as Relationship) || null
    );
  }

  async getRelationships(params: { user_id: UUID }): Promise<Relationship[]> {
    const sql = "SELECT * FROM relationships WHERE (user_a = ? OR user_b = ?)";
    return this.db
      .prepare(sql)
      .all(params.user_id, params.user_id) as Relationship[];
  }
}
