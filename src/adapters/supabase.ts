import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type Memory,
  type Goal,
  type Relationship,
  Actor,
  GoalStatus,
  Account,
  type UUID,
  Participant,
  Room,
} from "../core/types.ts";
import { DatabaseAdapter } from "../core/database.ts";
import { v4 as uuid } from "uuid";
export class SupabaseDatabaseAdapter extends DatabaseAdapter {
  async getRoom(room_id: UUID): Promise<UUID | null> {
    const { data, error } = await this.supabase
      .from("rooms")
      .select("id")
      .eq("id", room_id)
      .single();

    if (error) {
      throw new Error(`Error getting room: ${error.message}`);
    }

    return data ? (data.id as UUID) : null;
  }

  async getParticipantsForAccount(user_id: UUID): Promise<Participant[]> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      throw new Error(
        `Error getting participants for account: ${error.message}`,
      );
    }

    return data as Participant[];
  }

  async getParticipantUserState(
    roomId: UUID,
    userId: UUID,
  ): Promise<"FOLLOWED" | "MUTED" | null> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("user_state")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting participant user state:", error);
      return null;
    }

    return data?.user_state as "FOLLOWED" | "MUTED" | null;
  }

  async setParticipantUserState(
    roomId: UUID,
    userId: UUID,
    state: "FOLLOWED" | "MUTED" | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("participants")
      .update({ user_state: state })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error setting participant user state:", error);
      throw new Error("Failed to set participant user state");
    }
  }

  async getParticipantsForRoom(room_id: UUID): Promise<UUID[]> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("user_id")
      .eq("room_id", room_id);

    if (error) {
      throw new Error(`Error getting participants for room: ${error.message}`);
    }

    return data.map((row) => row.user_id as UUID);
  }

  supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getMemoriesByRoomIds(params: { room_ids: UUID[]; tableName: string }): Promise<Memory[]> {
    const { data, error } = await this.supabase
      .from(params.tableName)
      .select('*')
      .in('room_id', params.room_ids);
  
    if (error) {
      console.error('Error retrieving memories by room IDs:', error);
      return [];
    }

    // map created_at to Date
    const memories = data.map((memory) => ({
      ...memory,
      created_at: new Date(memory.created_at),
    }));

    return memories as Memory[];
  }  

  async getAccountById(user_id: UUID): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from("accounts")
      .select("*")
      .eq("id", user_id);
    if (error) {
      throw new Error(error.message);
    }
    return (data?.[0] as Account) || null;
  }

  async createAccount(account: Account): Promise<boolean> {
    const { error } = await this.supabase.from("accounts").upsert([account]);
    if (error) {
      console.error(error.message);
      return false;
    }
    return true;
  }

  async getActorDetails(params: { room_id: UUID }): Promise<Actor[]> {
    try {
      const response = await this.supabase
        .from("rooms")
        .select(
          `
          participants:participants(
            account:accounts(id, name, username, details)
          )
      `,
        )
        .eq("id", params.room_id);

      if (response.error) {
        console.error("Error!" + response.error);
        return [];
      }
      const { data } = response;

      return data
        .map((room) =>
          room.participants.map((participant) => {
            const user = participant.account as unknown as Actor;
            return {
              name: user?.name,
              details: user?.details,
              id: user?.id,
              username: user?.username,
            };
          }),
        )
        .flat();
    } catch (error) {
      console.error("error", error);
      throw error;
    }
  }

  async searchMemories(params: {
    tableName: string;
    room_id: UUID;
    embedding: number[];
    match_threshold: number;
    match_count: number;
    unique: boolean;
  }): Promise<Memory[]> {
    const result = await this.supabase.rpc("search_memories", {
      query_table_name: params.tableName,
      query_room_id: params.room_id,
      query_embedding: params.embedding,
      query_match_threshold: params.match_threshold,
      query_match_count: params.match_count,
      query_unique: params.unique,
    });
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
    return result.data.map((memory) => ({
      ...memory,
      created_at: new Date(memory.created_at),
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
    const result = await this.supabase.rpc("get_embedding_list", opts);
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
    return result.data;
  }

  async updateGoalStatus(params: {
    goalId: UUID;
    status: GoalStatus;
  }): Promise<void> {
    await this.supabase
      .from("goals")
      .update({ status: params.status })
      .match({ id: params.goalId });
  }

  async log(params: {
    body: { [key: string]: unknown };
    user_id: UUID;
    room_id: UUID;
    type: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("logs").insert({
      body: params.body,
      user_id: params.user_id,
      room_id: params.room_id,
      type: params.type,
    });

    if (error) {
      console.error("Error inserting log:", error);
      throw new Error(error.message);
    }
  }

  async getMemories(params: {
    room_id: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    user_ids?: UUID[];
  }): Promise<Memory[]> {
    const result = await this.supabase.rpc("get_memories", {
      query_table_name: params.tableName,
      query_room_id: params.room_id,
      query_count: params.count,
      query_unique: !!params.unique,
      query_user_ids: params.user_ids,
    });
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
    if (!result.data) {
      console.warn("data was null, no memories found for", {
        room_id: params.room_id,
        count: params.count,
      });
      return [];
    }
    return result.data;
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
    const result = await this.supabase.rpc("search_memories", {
      query_table_name: params.tableName,
      query_room_id: params.room_id,
      query_embedding: embedding,
      query_match_threshold: params.match_threshold,
      query_match_count: params.count,
      query_unique: !!params.unique,
    });
    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
    return result.data.map((memory) => ({
      ...memory,
      created_at: new Date(memory.created_at),
    }));
  }

  async getMemoryById(memoryId: UUID): Promise<Memory | null> {
    const { data, error } = await this.supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .single();
  
    if (error) {
      console.error("Error retrieving memory by ID:", error);
      return null;
    }
  
    return data as Memory;
  }  

  async createMemory(
    memory: Memory,
    tableName: string,
    unique = false,
  ): Promise<void> {
    const created_at = memory.created_at.getTime() ?? new Date().getTime();
    if (unique) {
      const opts = {
        query_table_name: tableName,
        query_user_id: memory.user_id,
        query_content: memory.content.text,
        query_room_id: memory.room_id,
        query_embedding: memory.embedding,
        query_created_at: created_at,
        similarity_threshold: 0.95,
      };

      const result = await this.supabase.rpc(
        "check_similarity_and_insert",
        opts,
      );

      if (result.error) {
        throw new Error(JSON.stringify(result.error));
      }
    } else {
      const result = await this.supabase
        .from("memories")
        .insert({ ...memory, created_at, type: tableName });
      const { error } = result;
      if (error) {
        throw new Error(JSON.stringify(error));
      }
    }
  }

  async removeMemory(memoryId: UUID): Promise<void> {
    const result = await this.supabase
      .from("memories")
      .delete()
      .eq("id", memoryId);
    const { error } = result;
    if (error) {
      throw new Error(JSON.stringify(error));
    }
  }

  async removeAllMemories(room_id: UUID, tableName: string): Promise<void> {
    const result = await this.supabase.rpc("remove_memories", {
      query_table_name: tableName,
      query_room_id: room_id,
    });

    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }
  }

  async countMemories(
    room_id: UUID,
    unique = true,
    tableName: string,
  ): Promise<number> {
    if (!tableName) {
      throw new Error("tableName is required");
    }
    const query = {
      query_table_name: tableName,
      query_room_id: room_id,
      query_unique: !!unique,
    };
    const result = await this.supabase.rpc("count_memories", query);

    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }

    return result.data;
  }

  async getGoals(params: {
    room_id: UUID;
    user_id?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]> {
    const opts = {
      query_room_id: params.room_id,
      query_user_id: params.user_id,
      only_in_progress: params.onlyInProgress,
      row_count: params.count,
    };

    const { data: goals, error } = await this.supabase.rpc("get_goals", opts);

    if (error) {
      throw new Error(error.message);
    }

    return goals;
  }

  async updateGoal(goal: Goal): Promise<void> {
    const { error } = await this.supabase
      .from("goals")
      .update(goal)
      .match({ id: goal.id });
    if (error) {
      throw new Error(`Error creating goal: ${error.message}`);
    }
  }

  async createGoal(goal: Goal): Promise<void> {
    const { error } = await this.supabase.from("goals").insert(goal);
    if (error) {
      throw new Error(`Error creating goal: ${error.message}`);
    }
  }

  async removeGoal(goalId: UUID): Promise<void> {
    const { error } = await this.supabase
      .from("goals")
      .delete()
      .eq("id", goalId);
    if (error) {
      throw new Error(`Error removing goal: ${error.message}`);
    }
  }

  async removeAllGoals(room_id: UUID): Promise<void> {
    const { error } = await this.supabase
      .from("goals")
      .delete()
      .eq("room_id", room_id);
    if (error) {
      throw new Error(`Error removing goals: ${error.message}`);
    }
  }

  async getRoomsForParticipant(user_id: UUID): Promise<UUID[]> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("room_id")
      .eq("user_id", user_id);

    if (error) {
      throw new Error(`Error getting rooms by participant: ${error.message}`);
    }

    return data.map((row) => row.room_id as UUID);
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("room_id")
      .in("user_id", userIds);

    if (error) {
      throw new Error(`Error getting rooms by participants: ${error.message}`);
    }

    return [...new Set(data.map((row) => row.room_id as UUID))] as UUID[];
  }

  async createRoom(room_id?: UUID): Promise<UUID> {
    room_id = room_id ?? (uuid() as UUID);
    const { data, error } = await this.supabase.rpc("create_room", {
      room_id,
    });

    if (error) {
      throw new Error(`Error creating room: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned from room creation");
    }

    return data[0].id as UUID;
  }

  async removeRoom(room_id: UUID): Promise<void> {
    const { error } = await this.supabase
      .from("rooms")
      .delete()
      .eq("id", room_id);

    if (error) {
      throw new Error(`Error removing room: ${error.message}`);
    }
  }

  async addParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    const { error } = await this.supabase
      .from("participants")
      .insert({ user_id: user_id, room_id: room_id });

    if (error) {
      console.error(`Error adding participant: ${error.message}`);
      return false;
    }
    return true;
  }

  async removeParticipant(user_id: UUID, room_id: UUID): Promise<boolean> {
    const { error } = await this.supabase
      .from("participants")
      .delete()
      .eq("user_id", user_id)
      .eq("room_id", room_id);

    if (error) {
      console.error(`Error removing participant: ${error.message}`);
      return false;
    }
    return true;
  }

  async createRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<boolean> {
    const allRoomData = await this.getRoomsForParticipants([
      params.userA,
      params.userB,
    ]);

    let room_id: UUID;

    if (!allRoomData || allRoomData.length === 0) {
      // If no existing room is found, create a new room
      const { data: newRoomData, error: roomsError } = await this.supabase
        .from("rooms")
        .insert({})
        .single();

      if (roomsError) {
        throw new Error("Room creation error: " + roomsError.message);
      }

      room_id = (newRoomData as Room)?.id as UUID;
    } else {
      // If an existing room is found, use the first room's ID
      room_id = allRoomData[0];
    }

    const { error: participantsError } = await this.supabase
      .from("participants")
      .insert([
        { user_id: params.userA, room_id },
        { user_id: params.userB, room_id },
      ]);

    if (participantsError) {
      throw new Error(
        "Participants creation error: " + participantsError.message,
      );
    }

    // Create or update the relationship between the two users
    const { error: relationshipError } = await this.supabase
      .from("relationships")
      .upsert({
        user_a: params.userA,
        user_b: params.userB,
        user_id: params.userA,
        status: "FRIENDS",
      })
      .eq("user_a", params.userA)
      .eq("user_b", params.userB);

    if (relationshipError) {
      throw new Error(
        "Relationship creation error: " + relationshipError.message,
      );
    }

    return true;
  }

  async getRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<Relationship | null> {
    const { data, error } = await this.supabase.rpc("get_relationship", {
      usera: params.userA,
      userb: params.userB,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data[0];
  }

  async getRelationships(params: { user_id: UUID }): Promise<Relationship[]> {
    const { data, error } = await this.supabase
      .from("relationships")
      .select("*")
      .or(`user_a.eq.${params.user_id},user_b.eq.${params.user_id}`)
      .eq("status", "FRIENDS");

    if (error) {
      throw new Error(error.message);
    }

    return data as Relationship[];
  }
}
