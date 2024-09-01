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
import { Database } from "./sqljs/types.ts";

export class SqlJsDatabaseAdapter extends DatabaseAdapter {
  async getRoom(room_id: UUID): Promise<UUID | null> {
    const sql = "SELECT id FROM rooms WHERE id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([room_id]);
    const room = stmt.getAsObject() as { id: string } | undefined;
    stmt.free();
    return room ? (room.id as UUID) : null;
  }

  async getParticipantsForAccount(user_id: UUID): Promise<Participant[]> {
    const sql = `
      SELECT p.id, p.user_id, p.room_id, p.last_message_read
      FROM participants p
      WHERE p.user_id = ?
    `;
    const stmt = this.db.prepare(sql);
    stmt.bind([user_id]);
    const participants: Participant[] = [];
    while (stmt.step()) {
      const participant = stmt.getAsObject() as unknown as Participant;
      participants.push(participant);
    }
    stmt.free();
    return participants;
  }

  async getParticipantUserState(
    roomId: UUID,
    userId: UUID,
  ): Promise<"FOLLOWED" | "MUTED" | null> {
    const sql =
      "SELECT user_state FROM participants WHERE room_id = ? AND user_id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([roomId, userId]);
    const result = stmt.getAsObject() as {
      user_state: "FOLLOWED" | "MUTED" | null;
    };
    stmt.free();
    return result.user_state ?? null;
  }

  async setParticipantUserState(
    roomId: UUID,
    userId: UUID,
    state: "FOLLOWED" | "MUTED" | null,
  ): Promise<void> {
    const sql =
      "UPDATE participants SET user_state = ? WHERE room_id = ? AND user_id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([state, roomId, userId]);
    stmt.step();
    stmt.free();
  }

  async getParticipantsForRoom(room_id: UUID): Promise<UUID[]> {
    const sql = "SELECT user_id FROM participants WHERE room_id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([room_id]);
    const userIds: UUID[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { user_id: string };
      userIds.push(row.user_id as UUID);
    }
    stmt.free();
    return userIds;
  }

  constructor(db: Database) {
    super();
    this.db = db;

    // Check if the 'accounts' table exists as a representative table
    const tableExists = this.db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'",
    )[0];

    if (!tableExists) {
      // If the 'accounts' table doesn't exist, create all the tables
      this.db.exec(sqliteTables);
    }
  }

  async getAccountById(user_id: UUID): Promise<Account | null> {
    const sql = "SELECT * FROM accounts WHERE id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([user_id]);
    const account = stmt.getAsObject() as unknown as Account | undefined;

    if (account && typeof account.details === "string") {
      account.details = JSON.parse(account.details);
    }

    stmt.free();
    return account || null;
  }

  async createAccount(account: Account): Promise<boolean> {
    try {
      const sql = `
      INSERT INTO accounts (id, name, email, avatar_url, details)
      VALUES (?, ?, ?, ?, ?)
      `;
      const stmt = this.db.prepare(sql);
      stmt.run([
        account.id ?? v4(),
        account.name,
        account.email || "",
        account.avatar_url || "",
        JSON.stringify(account.details),
      ]);
      stmt.free();
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
    const stmt = this.db.prepare(sql);
    stmt.bind([params.room_id]);
    const rows: Actor[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as Actor;
      rows.push({
        ...row,
        details:
          typeof row.details === "string"
            ? JSON.parse(row.details)
            : row.details,
      });
    }
    stmt.free();
    return rows;
  }

  async createMemory(memory: Memory, tableName: string): Promise<void> {
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

    // Insert the memory with the appropriate 'unique' value
    const sql = `INSERT INTO memories (id, type, content, embedding, user_id, room_id, \`unique\`, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(sql);
    stmt.run([
      v4(),
      tableName,
      JSON.stringify(memory.content),
      JSON.stringify(memory.embedding),
      memory.user_id,
      memory.room_id,
      isUnique ? 1 : 0,
      memory.created_at ?? new Date().toISOString(),
    ]);
    stmt.free();
  }

  async searchMemories(params: {
    tableName: string;
    room_id: UUID;
    embedding: number[];
    match_threshold: number;
    match_count: number;
    unique: boolean;
  }): Promise<Memory[]> {
    let sql =
      `
  SELECT *` +
      // TODO: Uncomment when we compile sql.js with vss
      // `, (1 - vss_distance_l2(embedding, ?)) AS similarity` +
      ` FROM memories
  WHERE type = ?
  AND room_id = ?`;

    if (params.unique) {
      sql += " AND `unique` = 1";
    }
    // TODO: Uncomment when we compile sql.js with vss
    // sql += ` ORDER BY similarity DESC LIMIT ?`;
    const stmt = this.db.prepare(sql);
    stmt.bind([
      // JSON.stringify(params.embedding),
      params.tableName,
      params.room_id,
      // params.match_count,
    ]);
    const memories: (Memory & { similarity: number })[] = [];
    while (stmt.step()) {
      const memory = stmt.getAsObject() as unknown as Memory & {
        similarity: number;
      };
      memories.push({
        ...memory,
        content: JSON.parse(memory.content as unknown as string),
      });
    }
    stmt.free();
    return memories;
  }

  async searchMemoriesByEmbedding(
    _embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      room_id?: UUID;
      unique?: boolean;
      tableName: string;
    },
  ): Promise<Memory[]> {
    let sql =
      `SELECT *` +
      // TODO: Uncomment when we compile sql.js with vss
      // `, (1 - vss_distance_l2(embedding, ?)) AS similarity`+
      ` FROM memories
        WHERE type = ?`;

    if (params.unique) {
      sql += " AND `unique` = 1";
    }
    if (params.room_id) {
      sql += " AND room_id = ?";
    }
    // TODO: Uncomment when we compile sql.js with vss
    // sql += ` ORDER BY similarity DESC`;

    if (params.count) {
      sql += " LIMIT ?";
    }

    const stmt = this.db.prepare(sql);
    const bindings = [
      // JSON.stringify(embedding),
      params.tableName,
    ];
    if (params.room_id) {
      bindings.push(params.room_id);
    }
    if (params.count) {
      bindings.push(params.count.toString());
    }

    stmt.bind(bindings);
    const memories: (Memory & { similarity: number })[] = [];
    while (stmt.step()) {
      const memory = stmt.getAsObject() as unknown as Memory & {
        similarity: number;
      };
      memories.push({
        ...memory,
        content: JSON.parse(memory.content as unknown as string),
      });
    }
    stmt.free();
    return memories;
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
    const sql =
      `
        SELECT *
        FROM memories
        WHERE type = ?` +
      // `AND vss_search(${opts.query_field_name}, ?)
      // ORDER BY vss_search(${opts.query_field_name}, ?) DESC` +
      ` LIMIT ?
      `;
    const stmt = this.db.prepare(sql);
    stmt.bind([
      opts.query_table_name,
      // opts.query_input,
      // opts.query_input,
      opts.query_match_count,
    ]);
    const memories: Memory[] = [];
    while (stmt.step()) {
      const memory = stmt.getAsObject() as unknown as Memory;
      memories.push(memory);
    }
    stmt.free();

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
    const stmt = this.db.prepare(sql);
    stmt.run([params.status, params.goalId]);
    stmt.free();
  }

  async log(params: {
    body: { [key: string]: unknown };
    user_id: UUID;
    room_id: UUID;
    type: string;
  }): Promise<void> {
    const sql =
      "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)";
    const stmt = this.db.prepare(sql);
    stmt.run([
      JSON.stringify(params.body),
      params.user_id,
      params.room_id,
      params.type,
    ]);
    stmt.free();
  }

  async getMemories(params: { room_id: UUID; count?: number; unique?: boolean; tableName: string; user_ids?: UUID[] }): Promise<Memory[]> {
    if (!params.tableName) {
      throw new Error("tableName is required");
    }
    if (!params.room_id) {
      throw new Error("room_id is required");
    }
    let sql = `SELECT * FROM memories WHERE type = ? AND room_id = ?`;
  
    if (params.unique) {
      sql += " AND \`unique\` = 1";
    }
  
    if (params.user_ids && params.user_ids.length > 0) {
      sql += ` AND user_id IN (${params.user_ids.map(() => '?').join(',')})`;
    }
  
    sql += " ORDER BY created_at DESC";
  
    if (params.count) {
      sql += " LIMIT ?";
    }
  
    const stmt = this.db.prepare(sql);
    stmt.bind([params.tableName, params.room_id, ...(params.user_ids || []), ...(params.count ? [params.count] : [])]);
    const memories: Memory[] = [];
    while (stmt.step()) {
      const memory = stmt.getAsObject() as unknown as Memory;
      memories.push({
        ...memory,
        content: JSON.parse(memory.content as unknown as string),
      });
    }
    stmt.free();
    return memories;
  }

  async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
    const sql = `DELETE FROM memories WHERE type = ? AND id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run([tableName, memoryId]);
    stmt.free();
  }

  async removeAllMemories(room_id: UUID, tableName: string): Promise<void> {
    const sql = `DELETE FROM memories WHERE type = ? AND room_id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run([tableName, room_id]);
    stmt.free();
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
    if (unique) {
      sql += " AND `unique` = 1";
    }

    const stmt = this.db.prepare(sql);
    stmt.bind([tableName, room_id]);

    let count = 0;
    if (stmt.step()) {
      const result = stmt.getAsObject() as { count: number };
      count = result.count;
    }

    stmt.free();
    return count;
  }

  async getGoals(params: {
    room_id: UUID;
    user_id?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]> {
    let sql = "SELECT * FROM goals WHERE room_id = ?";
    const bindings: (string | number)[] = [params.room_id];

    if (params.user_id) {
      sql += " AND user_id = ?";
      bindings.push(params.user_id);
    }

    if (params.onlyInProgress) {
      sql += " AND status = 'IN_PROGRESS'";
    }

    if (params.count) {
      sql += " LIMIT ?";
      bindings.push(params.count.toString());
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(bindings);
    const goals: Goal[] = [];
    while (stmt.step()) {
      const goal = stmt.getAsObject() as unknown as Goal;
      goals.push({
        ...goal,
        objectives:
          typeof goal.objectives === "string"
            ? JSON.parse(goal.objectives)
            : goal.objectives,
      });
    }
    stmt.free();
    return goals;
  }

  async updateGoal(goal: Goal): Promise<void> {
    const sql =
      "UPDATE goals SET name = ?, status = ?, objectives = ? WHERE id = ?";
    const stmt = this.db.prepare(sql);
    stmt.run([
      goal.name,
      goal.status,
      JSON.stringify(goal.objectives),
      goal.id as string,
    ]);
    stmt.free();
  }

  async createGoal(goal: Goal): Promise<void> {
    const sql =
      "INSERT INTO goals (id, room_id, user_id, name, status, objectives) VALUES (?, ?, ?, ?, ?, ?)";
    const stmt = this.db.prepare(sql);
    stmt.run([
      goal.id ?? v4(),
      goal.room_id,
      goal.user_id,
      goal.name,
      goal.status,
      JSON.stringify(goal.objectives),
    ]);
    stmt.free();
  }

  async removeGoal(goalId: UUID): Promise<void> {
    const sql = "DELETE FROM goals WHERE id = ?";
    const stmt = this.db.prepare(sql);
    stmt.run([goalId]);
    stmt.free();
  }

  async removeAllGoals(room_id: UUID): Promise<void> {
    const sql = "DELETE FROM goals WHERE room_id = ?";
    const stmt = this.db.prepare(sql);
    stmt.run([room_id]);
    stmt.free();
  }

  async createRoom(room_id?: UUID): Promise<UUID> {
    room_id = room_id || (v4() as UUID);
    try {
      const sql = "INSERT INTO rooms (id) VALUES (?)";
      const stmt = this.db.prepare(sql);
      stmt.run([room_id ?? (v4() as UUID)]);
      stmt.free();
    } catch (error) {
      console.log("Error creating room", error);
    }
    return room_id as UUID;
  }

  async removeRoom(room_id: UUID): Promise<void> {
    const sql = "DELETE FROM rooms WHERE id = ?";
    const stmt = this.db.prepare(sql);
    stmt.run([room_id]);
    stmt.free();
  }

  async getRoomsForParticipant(user_id: UUID): Promise<UUID[]> {
    const sql = "SELECT room_id FROM participants WHERE user_id = ?";
    const stmt = this.db.prepare(sql);
    stmt.bind([user_id]);
    const rows: { room_id: string }[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as { room_id: string };
      rows.push(row);
    }
    stmt.free();
    return rows.map((row) => row.room_id as UUID);
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    // Assuming userIds is an array of UUID strings, prepare a list of placeholders
    const placeholders = userIds.map(() => "?").join(", ");
    // Construct the SQL query with the correct number of placeholders
    const sql = `SELECT room_id FROM participants WHERE user_id IN (${placeholders})`;
    const stmt = this.db.prepare(sql);
    // Execute the query with the userIds array spread into arguments
    stmt.bind(userIds);
    const rows: { room_id: string }[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as { room_id: string };
      rows.push(row);
    }
    stmt.free();
    // Map and return the room_id values as UUIDs
    return rows.map((row) => row.room_id as UUID);
  }

  async addParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    try {
      const sql =
        "INSERT INTO participants (id, user_id, room_id) VALUES (?, ?, ?)";
      const stmt = this.db.prepare(sql);
      stmt.run([v4(), user_id, room_id]);
      stmt.free();
      return true;
    } catch (error) {
      console.log("Error adding participant", error);
      return false;
    }
  }

  async removeParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    try {
      const sql = "DELETE FROM participants WHERE user_id = ? AND room_id = ?";
      const stmt = this.db.prepare(sql);
      stmt.run([user_id, room_id]);
      stmt.free();
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
    const stmt = this.db.prepare(sql);
    stmt.run([v4(), params.userA, params.userB, params.userA]);
    stmt.free();
    return true;
  }

  async getRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<Relationship | null> {
    let relationship: Relationship | null = null;
    try {
      const sql =
        "SELECT * FROM relationships WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)";
      const stmt = this.db.prepare(sql);
      stmt.bind([params.userA, params.userB, params.userB, params.userA]);

      if (stmt.step()) {
        relationship = stmt.getAsObject() as unknown as Relationship;
      }
      stmt.free();
    } catch (error) {
      console.log("Error fetching relationship", error);
    }
    return relationship;
  }

  async getRelationships(params: { user_id: UUID }): Promise<Relationship[]> {
    const sql = "SELECT * FROM relationships WHERE (user_a = ? OR user_b = ?)";
    const stmt = this.db.prepare(sql);
    stmt.bind([params.user_id, params.user_id]);
    const relationships: Relationship[] = [];
    while (stmt.step()) {
      const relationship = stmt.getAsObject() as unknown as Relationship;
      relationships.push(relationship);
    }
    stmt.free();
    return relationships;
  }
}
