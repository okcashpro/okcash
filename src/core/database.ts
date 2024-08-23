import {
  Account,
  Actor,
  GoalStatus,
  type Goal,
  type Memory,
  type Relationship,
  type UUID,
  Participant,
} from "./types.ts";

/**
 * An abstract class representing a database adapter for managing various entities
 * like accounts, memories, actors, goals, and rooms.
 */
export abstract class DatabaseAdapter {
  /**
   * Retrieves an account by its ID.
   * @param user_id The UUID of the user account to retrieve.
   * @returns A Promise that resolves to the Account object or null if not found.
   */
  abstract getAccountById(user_id: UUID): Promise<Account | null>;

  /**
   * Creates a new account in the database.
   * @param account The account object to create.
   * @returns A Promise that resolves when the account creation is complete.
   */
  abstract createAccount(account: Account): Promise<boolean>;

  /**
   * Retrieves memories based on the specified parameters.
   * @param params An object containing parameters for the memory retrieval.
   * @returns A Promise that resolves to an array of Memory objects.
   */
  abstract getMemories(params: {
    room_id: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
  }): Promise<Memory[]>;

  /**
   * Retrieves cached embeddings based on the specified query parameters.
   * @param params An object containing parameters for the embedding retrieval.
   * @returns A Promise that resolves to an array of objects containing embeddings and levenshtein scores.
   */
  abstract getCachedEmbeddings({
    query_table_name,
    query_threshold,
    query_input,
    query_field_name,
    query_field_sub_name,
    query_match_count,
  }: {
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
  >;

  /**
   * Logs an event or action with the specified details.
   * @param params An object containing parameters for the log entry.
   * @returns A Promise that resolves when the log entry has been saved.
   */
  abstract log(params: {
    body: { [key: string]: unknown };
    user_id: UUID;
    room_id: UUID;
    type: string;
  }): Promise<void>;

  /**
   * Retrieves details of actors in a given room.
   * @param params An object containing the room_id to search for actors.
   * @returns A Promise that resolves to an array of Actor objects.
   */
  abstract getActorDetails(params: { room_id: UUID }): Promise<Actor[]>;

  /**
   * Searches for memories based on embeddings and other specified parameters.
   * @param params An object containing parameters for the memory search.
   * @returns A Promise that resolves to an array of Memory objects.
   */
  abstract searchMemories(params: {
    tableName: string;
    room_id: UUID;
    embedding: number[];
    match_threshold: number;
    match_count: number;
    unique: boolean;
  }): Promise<Memory[]>;

  /**
   * Updates the status of a specific goal.
   * @param params An object containing the goalId and the new status.
   * @returns A Promise that resolves when the goal status has been updated.
   */
  abstract updateGoalStatus(params: {
    goalId: UUID;
    status: GoalStatus;
  }): Promise<void>;

  /**
   * Searches for memories by embedding and other specified parameters.
   * @param embedding The embedding vector to search with.
   * @param params Additional parameters for the search.
   * @returns A Promise that resolves to an array of Memory objects.
   */
  abstract searchMemoriesByEmbedding(
    embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      room_id?: UUID;
      unique?: boolean;
      tableName: string;
    },
  ): Promise<Memory[]>;

  /**
   * Creates a new memory in the database.
   * @param memory The memory object to create.
   * @param tableName The table where the memory should be stored.
   * @param unique Indicates if the memory should be unique.
   * @returns A Promise that resolves when the memory has been created.
   */
  abstract createMemory(
    memory: Memory,
    tableName: string,
    unique?: boolean,
  ): Promise<void>;

  /**
   * Removes a specific memory from the database.
   * @param memoryId The UUID of the memory to remove.
   * @param tableName The table from which the memory should be removed.
   * @returns A Promise that resolves when the memory has been removed.
   */
  abstract removeMemory(memoryId: UUID, tableName: string): Promise<void>;

  /**
   * Removes all memories associated with a specific room.
   * @param room_id The UUID of the room whose memories should be removed.
   * @param tableName The table from which the memories should be removed.
   * @returns A Promise that resolves when all memories have been removed.
   */
  abstract removeAllMemories(room_id: UUID, tableName: string): Promise<void>;

  /**
   * Counts the number of memories in a specific room.
   * @param room_id The UUID of the room for which to count memories.
   * @param unique Specifies whether to count only unique memories.
   * @param tableName Optional table name to count memories from.
   * @returns A Promise that resolves to the number of memories.
   */
  abstract countMemories(
    room_id: UUID,
    unique?: boolean,
    tableName?: string,
  ): Promise<number>;

  /**
   * Retrieves goals based on specified parameters.
   * @param params An object containing parameters for goal retrieval.
   * @returns A Promise that resolves to an array of Goal objects.
   */
  abstract getGoals(params: {
    room_id: UUID;
    user_id?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]>;

  /**
   * Updates a specific goal in the database.
   * @param goal The goal object with updated properties.
   * @returns A Promise that resolves when the goal has been updated.
   */
  abstract updateGoal(goal: Goal): Promise<void>;

  /**
   * Creates a new goal in the database.
   * @param goal The goal object to create.
   * @returns A Promise that resolves when the goal has been created.
   */
  abstract createGoal(goal: Goal): Promise<void>;

  /**
   * Removes a specific goal from the database.
   * @param goalId The UUID of the goal to remove.
   * @returns A Promise that resolves when the goal has been removed.
   */
  abstract removeGoal(goalId: UUID): Promise<void>;

  /**
   * Removes all goals associated with a specific room.
   * @param room_id The UUID of the room whose goals should be removed.
   * @returns A Promise that resolves when all goals have been removed.
   */
  abstract removeAllGoals(room_id: UUID): Promise<void>;

  /**
   * Retrieves the room ID for a given room, if it exists.
   * @param room_id The UUID of the room to retrieve.
   * @returns A Promise that resolves to the room ID or null if not found.
   */
  abstract getRoom(room_id: UUID): Promise<UUID | null>;

  /**
   * Creates a new room with an optional specified ID.
   * @param room_id Optional UUID to assign to the new room.
   * @returns A Promise that resolves to the UUID of the created room.
   */
  abstract createRoom(room_id?: UUID): Promise<UUID>;

  /**
   * Removes a specific room from the database.
   * @param room_id The UUID of the room to remove.
   * @returns A Promise that resolves when the room has been removed.
   */
  abstract removeRoom(room_id: UUID): Promise<void>;

  /**
   * Retrieves room IDs for which a specific user is a participant.
   * @param user_id The UUID of the user.
   * @returns A Promise that resolves to an array of room IDs.
   */
  abstract getRoomsForParticipant(user_id: UUID): Promise<UUID[]>;

  /**
   * Retrieves room IDs for which specific users are participants.
   * @param userIds An array of UUIDs of the users.
   * @returns A Promise that resolves to an array of room IDs.
   */
  abstract getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;

  /**
   * Adds a user as a participant to a specific room.
   * @param user_id The UUID of the user to add as a participant.
   * @param room_id The UUID of the room to which the user will be added.
   * @returns A Promise that resolves to a boolean indicating success or failure.
   */
  abstract addParticipant(user_id: UUID, room_id: UUID): Promise<boolean>;

  /**
   * Removes a user as a participant from a specific room.
   * @param user_id The UUID of the user to remove as a participant.
   * @param room_id The UUID of the room from which the user will be removed.
   * @returns A Promise that resolves to a boolean indicating success or failure.
   */
  abstract removeParticipant(user_id: UUID, room_id: UUID): Promise<boolean>;

  /**
   * Retrieves participants associated with a specific account.
   * @param user_id The UUID of the account.
   * @returns A Promise that resolves to an array of Participant objects.
   */
  abstract getParticipantsForAccount(user_id: UUID): Promise<Participant[]>;

  /**
   * Retrieves participants associated with a specific account.
   * @param user_id The UUID of the account.
   * @returns A Promise that resolves to an array of Participant objects.
   */
  abstract getParticipantsForAccount(user_id: UUID): Promise<Participant[]>;

  /**
   * Retrieves participants for a specific room.
   * @param room_id The UUID of the room for which to retrieve participants.
   * @returns A Promise that resolves to an array of UUIDs representing the participants.
   */
  abstract getParticipantsForRoom(room_id: UUID): Promise<UUID[]>;

  /**
   * Creates a new relationship between two users.
   * @param params An object containing the UUIDs of the two users (userA and userB).
   * @returns A Promise that resolves to a boolean indicating success or failure of the creation.
   */
  abstract createRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<boolean>;

  /**
   * Retrieves a relationship between two users if it exists.
   * @param params An object containing the UUIDs of the two users (userA and userB).
   * @returns A Promise that resolves to the Relationship object or null if not found.
   */
  abstract getRelationship(params: {
    userA: UUID;
    userB: UUID;
  }): Promise<Relationship | null>;

  /**
   * Retrieves all relationships for a specific user.
   * @param params An object containing the UUID of the user.
   * @returns A Promise that resolves to an array of Relationship objects.
   */
  abstract getRelationships(params: { user_id: UUID }): Promise<Relationship[]>;
}
