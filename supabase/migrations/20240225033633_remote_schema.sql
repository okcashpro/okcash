
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'vector'
    ) THEN
        CREATE EXTENSION vector
        SCHEMA extensions;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION "public"."check_similarity_and_insert"("query_table_name" "text", "query_user_id" "uuid", "query_user_ids" "uuid"[], "query_content" "jsonb", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    similar_found BOOLEAN := FALSE;
    select_query TEXT;
    insert_query TEXT;
BEGIN
    -- Only perform the similarity check if query_embedding is not NULL
    IF query_embedding IS NOT NULL THEN
        -- Build a dynamic query to check for existing similar embeddings using cosine distance
        select_query := format(
            'SELECT EXISTS (' ||
                'SELECT 1 ' ||
                'FROM %I ' ||
                'WHERE user_id = %L ' ||
                'AND user_ids @> %L ' ||
                'AND user_ids <@ %L ' ||
                'AND embedding <=> %L < %L ' || -- Using cosine distance and comparing with threshold
                'LIMIT 1' ||
            ')',
            query_table_name,
            query_user_id,
            query_user_ids,
            query_embedding,
            similarity_threshold
        );

        -- Execute the query to check for similarity
        EXECUTE select_query INTO similar_found;
    END IF;

    -- Prepare the insert query with 'unique' field set based on the presence of similar records or NULL query_embedding
    insert_query := format(
        'INSERT INTO %I (user_id, user_ids, content, room_id, embedding, "unique") ' ||
        'VALUES (%L, %L, %L, %L, %L, %L)',
        query_table_name,
        query_user_id,
        query_user_ids,
        query_content,
        query_room_id,
        query_embedding,
        NOT similar_found OR query_embedding IS NULL  -- Set 'unique' to true if no similar record is found or query_embedding is NULL
    );

    -- Execute the insert query
    EXECUTE insert_query;
END;
$$;

ALTER FUNCTION "public"."check_similarity_and_insert"("query_table_name" "text", "query_user_id" "uuid", "query_user_ids" "uuid"[], "query_content" "jsonb", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."count_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_unique" boolean DEFAULT false) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    query TEXT;
    total BIGINT;
BEGIN
    -- Initialize the base query
    query := format('SELECT COUNT(*) FROM %I WHERE TRUE', query_table_name);

    -- Add condition for user_ids if not null, ensuring proper spacing
    IF query_user_ids IS NOT NULL THEN
        query := query || format(' AND user_ids @> %L::uuid[]', query_user_ids);
    END IF;

    -- Add condition for unique if TRUE, ensuring proper spacing
    IF query_unique THEN
        query := query || ' AND "unique" = TRUE';  -- Use double quotes if "unique" is a reserved keyword or potentially problematic
    END IF;

    -- Debug: Output the constructed query
    RAISE NOTICE 'Executing query: %', query;

    -- Execute the constructed query
    EXECUTE query INTO total;
    RETURN total;
END;
$$;

ALTER FUNCTION "public"."count_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_unique" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_dm_room"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_room_id UUID;
BEGIN
  IF NEW.status = 'FRIENDS' AND NEW.room_id IS NULL THEN
    INSERT INTO rooms (created_by, name)
    VALUES (NULL, 'Direct Message')
    RETURNING id INTO new_room_id;

    UPDATE friendships
    SET room_id = new_room_id
    WHERE id = NEW.id;

    INSERT INTO participants (user_id, room_id)
    VALUES (NEW.user_id_1, new_room_id), (NEW.user_id_2, new_room_id);
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_dm_room"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_friendship_and_room_for_user"("p_new_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  host_agent_id UUID := '00000000-0000-0000-0000-000000000000';
  new_room_id UUID;
BEGIN
  -- Create a new room for the direct message between the specified user and the host agent
  INSERT INTO rooms (created_by, name)
  VALUES (p_new_user_id, 'Direct Message with Host Agent')
  RETURNING id INTO new_room_id;

  -- Create a new friendship between the specified user and the host agent
  INSERT INTO relationships (user_id_1, user_id_2, status, room_id)
  VALUES (p_new_user_id, host_agent_id, 'FRIENDS', new_room_id);

  -- Add both users as participants of the new room
  INSERT INTO participants (user_id, room_id)
  VALUES (p_new_user_id, new_room_id), (host_agent_id, new_room_id);
END;
$$;

ALTER FUNCTION "public"."create_friendship_and_room_for_user"("p_new_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_friendship_with_host_agent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  host_agent_id UUID := '00000000-0000-0000-0000-000000000000';
  new_room_id UUID;
BEGIN
  -- Create a new room for the direct message between the new user and the host agent
  INSERT INTO rooms (created_by, name)
  VALUES (NEW.id, 'Direct Message with Host Agent')
  RETURNING id INTO new_room_id;

  -- Create a new friendship between the new user and the host agent
  INSERT INTO relationships (user_a, user_b, user_id, status, room_id)
  VALUES (NEW.id, host_agent_id, host_agent_id, 'FRIENDS', new_room_id);

  -- Add both users as participants of the new room
  INSERT INTO participants (user_id, room_id)
  VALUES (NEW.id, new_room_id), (host_agent_id, new_room_id);

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_friendship_with_host_agent"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_room_and_participants_on_friendship_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM rooms WHERE id = OLD.room_id;

  RETURN OLD;
END;
$$;

ALTER FUNCTION "public"."delete_room_and_participants_on_friendship_delete"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "user_id" "uuid",
    "name" "text",
    "status" "text",
    "description" "text",
    "objectives" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL
);

ALTER TABLE "public"."goals" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_goals_by_user_ids"("query_user_ids" "uuid"[], "query_user_id" "uuid" DEFAULT NULL::"uuid", "only_in_progress" boolean DEFAULT true, "row_count" integer DEFAULT 5) RETURNS SETOF "public"."goals"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM goals
    WHERE
        (query_user_id IS NULL OR user_id = query_user_id)
        AND (user_ids @> query_user_ids)
        AND (NOT only_in_progress OR status = 'IN_PROGRESS')
    LIMIT row_count;
END;
$$;

ALTER FUNCTION "public"."get_goals_by_user_ids"("query_user_ids" "uuid"[], "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_count" integer, "query_unique" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "user_id" "uuid", "content" "jsonb", "created_at" timestamp with time zone, "user_ids" "uuid"[], "room_id" "uuid", "embedding" "extensions"."vector")
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    query TEXT;
BEGIN
    query := format($fmt$
        SELECT
            id,
            user_id,
            content,
            created_at,
            user_ids,
            room_id,
            embedding
        FROM %I
        WHERE TRUE
        %s -- Condition for user_ids
        %s -- Additional condition for 'unique' column based on query_unique
        ORDER BY created_at DESC
        LIMIT %L
        $fmt$,
        query_table_name,
        CASE WHEN query_user_ids IS NOT NULL THEN format(' AND user_ids @> %L', query_user_ids) ELSE '' END,
        CASE WHEN query_unique THEN ' AND "unique" = TRUE' ELSE '' END, -- Enclose 'unique' in double quotes
        query_count
    );

    RETURN QUERY EXECUTE query;
END;
$_$;

ALTER FUNCTION "public"."get_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_count" integer, "query_unique" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_message_count"("p_user_id" "uuid") RETURNS TABLE("room_id" "uuid", "unread_messages_count" integer)
    LANGUAGE "plpgsql"
    AS $$BEGIN
  RETURN QUERY
  SELECT p.room_id, COALESCE(COUNT(m.id)::integer, 0) AS unread_messages_count
  FROM participants p
  LEFT JOIN messages m ON p.room_id = m.room_id
  WHERE p.user_id = p_user_id
  GROUP BY p.room_id;
END;
$$;

ALTER FUNCTION "public"."get_message_count"("p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_recent_rows_per_user"("query_table_name" "text", "array_of_uuid_arrays" "uuid"[], "n_rows_per_user" integer, "timestamp_column_name" "text") RETURNS TABLE("user_id" "uuid", "content" "jsonb", "timestamp_column" timestamp without time zone)
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    dynamic_query TEXT;
    i INT;
    uuid_array UUID[];
BEGIN
    -- Initialize the dynamic query with a common table expression (CTE)
    dynamic_query := format($f$
        WITH ranked_messages AS (
            SELECT user_id, content, %I, ROW_NUMBER() OVER (PARTITION BY UNNEST(user_ids) ORDER BY %I DESC) AS rn
            FROM %I
            WHERE FALSE
        $f$, timestamp_column_name, timestamp_column_name, query_table_name);

    -- Loop through the array of UUID arrays using a FOR loop
    FOR i IN 1..array_length(array_of_uuid_arrays, 1) LOOP
        -- Access each UUID array by its index
        uuid_array := array_of_uuid_arrays[i];

        -- Append OR condition to check if user_ids contains all UUIDs in the current array
        dynamic_query := dynamic_query || format($f$
            OR user_ids @> %L::uuid[]
        $f$, uuid_array);
    END LOOP;

    -- Complete the dynamic query by selecting rows where the rank is within the top N for each user
    dynamic_query := dynamic_query || format($f$
        )
        SELECT user_id, content, %I AS timestamp_column
        FROM ranked_messages
        WHERE rn <= %L
        $f$, timestamp_column_name, n_rows_per_user);

    -- Execute the dynamic query and return the result set
    RETURN QUERY EXECUTE dynamic_query;
END;
$_$;

ALTER FUNCTION "public"."get_recent_rows_per_user"("query_table_name" "text", "array_of_uuid_arrays" "uuid"[], "n_rows_per_user" integer, "timestamp_column_name" "text") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."relationships" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "user_a" "uuid",
    "user_b" "uuid",
    "status" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."relationships" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") RETURNS SETOF "public"."relationships"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM relationships
  WHERE (user_a = usera AND user_b = userb)
     OR (user_a = userb AND user_b = usera);
END;
$$;

ALTER FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_user_participant_in_room"("p_user_id" "uuid", "p_room_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  is_participant BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM participants
    WHERE user_id = p_user_id AND room_id = p_room_id
  ) INTO is_participant;

  RETURN is_participant;
END;
$$;

ALTER FUNCTION "public"."is_user_participant_in_room"("p_user_id" "uuid", "p_room_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."remove_memories"("query_table_name" "text", "query_user_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$DECLARE
    dynamic_query TEXT;
BEGIN
    -- Construct dynamic SQL to delete memories where user_ids contains all elements of query_user_ids
    dynamic_query := format('DELETE FROM %I WHERE user_ids @> $1', query_table_name);

    -- Execute the dynamic SQL statement
    EXECUTE dynamic_query USING query_user_ids;

    -- Add any post-deletion logic here if needed
END;
$_$;

ALTER FUNCTION "public"."remove_memories"("query_table_name" "text", "query_user_ids" "uuid"[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."search_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_embedding" "extensions"."vector", "query_match_threshold" double precision, "query_match_count" integer, "query_unique" boolean) RETURNS TABLE("id" "uuid", "user_id" "uuid", "content" "jsonb", "created_at" timestamp with time zone, "similarity" double precision, "user_ids" "uuid"[], "room_id" "uuid", "embedding" "extensions"."vector")
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    query TEXT;
BEGIN
    query := format($fmt$
        SELECT
            id,
            user_id,
            content,
            created_at,
            1 - (embedding <=> %L) AS similarity, -- Use '<=>' for cosine distance
            user_ids,
            room_id,
            embedding
        FROM %I
        WHERE (1 - (embedding <=> %L) > %L)
        %s -- Condition for user_ids
        %s -- Additional condition for 'unique' column
        ORDER BY similarity DESC
        LIMIT %L
        $fmt$,
        query_embedding,
        query_table_name,
        query_embedding,
        query_match_threshold,
        CASE WHEN query_user_ids IS NOT NULL THEN format(' AND user_ids @> %L', query_user_ids) ELSE '' END,
        CASE WHEN query_unique THEN ' AND unique = TRUE' ELSE '' END, -- Add condition based on 'query_unique'
        query_match_count
    );

    RETURN QUERY EXECUTE query;
END;
$_$;

ALTER FUNCTION "public"."search_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_embedding" "extensions"."vector", "query_match_threshold" double precision, "query_match_count" integer, "query_unique" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."search_messages"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "owner_id" "uuid", "chat_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("content" "text", "role" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    messages.content,
    messages.role,
    messages.created_at::timestamp with time zone
  FROM messages
  WHERE
    messages.owner = owner_id AND
    (chat_id IS NULL OR messages.chat = chat_id) AND
    1 - (messages.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    1 - (messages.embedding <=> query_embedding) DESC,
    messages.created_at
  LIMIT match_count;
END;
$$;

ALTER FUNCTION "public"."search_messages"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "owner_id" "uuid", "chat_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "name" "text",
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb"
);

ALTER TABLE "public"."accounts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."descriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb" NOT NULL,
    "embedding" "extensions"."vector" NOT NULL,
    "user_id" "uuid",
    "user_ids" "uuid"[],
    "room_id" "uuid",
    "name" "text",
    "unique" boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY "public"."descriptions" ALTER COLUMN "embedding" SET STORAGE EXTENDED;

ALTER TABLE "public"."descriptions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "jsonb" NOT NULL,
    "type" "text" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "user_ids" "uuid"[] NOT NULL,
    "agent_id" "uuid" NOT NULL
);

ALTER TABLE "public"."logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lore" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb" NOT NULL,
    "embedding" "extensions"."vector" NOT NULL,
    "user_id" "uuid",
    "user_ids" "uuid"[],
    "room_id" "uuid",
    "name" "text",
    "unique" boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY "public"."lore" ALTER COLUMN "embedding" SET STORAGE EXTENDED;

ALTER TABLE "public"."lore" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "user_id" "uuid",
    "content" "jsonb",
    "is_edited" boolean DEFAULT false,
    "room_id" "uuid",
    "updated_at" timestamp with time zone,
    "user_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "embedding" "extensions"."vector",
    "unique" boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY "public"."messages" ALTER COLUMN "embedding" SET STORAGE EXTENDED;

ALTER TABLE "public"."messages" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."participants" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "user_id" "uuid",
    "room_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "last_message_read" "uuid"
);

ALTER TABLE "public"."participants" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "created_by" "uuid",
    "name" "text"
);

ALTER TABLE "public"."rooms" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."facts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb" NOT NULL,
    "embedding" "extensions"."vector" NOT NULL,
    "user_id" "uuid",
    "user_ids" "uuid"[],
    "room_id" "uuid",
    "unique" boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY "public"."facts" ALTER COLUMN "embedding" SET STORAGE EXTENDED;

ALTER TABLE "public"."facts" OWNER TO "postgres";

ALTER TABLE ONLY "public"."descriptions"
    ADD CONSTRAINT "descriptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "friendships_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lore"
    ADD CONSTRAINT "lore_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."facts"
    ADD CONSTRAINT "reflections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE OR REPLACE TRIGGER "trigger_create_friendship_with_host_agent" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."create_friendship_with_host_agent"();

ALTER TABLE ONLY "public"."descriptions"
    ADD CONSTRAINT "descriptions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."descriptions"
    ADD CONSTRAINT "descriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."lore"
    ADD CONSTRAINT "public_lore_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."lore"
    ADD CONSTRAINT "public_lore_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."facts"
    ADD CONSTRAINT "reflections_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."facts"
    ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id");

CREATE POLICY "Can select and update all data" ON "public"."accounts" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Enable for authenticated users only" ON "public"."facts" TO "authenticated" USING (("auth"."uid"() = ANY ("user_ids"))) WITH CHECK (("auth"."uid"() = ANY ("user_ids")));

CREATE POLICY "Enable for users based on user_id" ON "public"."descriptions" TO "authenticated" USING (("auth"."uid"() = ANY ("user_ids"))) WITH CHECK (("auth"."uid"() = ANY ("user_ids")));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."accounts" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."logs" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."messages" TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."participants" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."relationships" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_a") OR ("auth"."uid"() = "user_b")));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."rooms" FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for self id" ON "public"."participants" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable read access for all users" ON "public"."accounts" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."rooms" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable read access for own messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = ANY ("user_ids")) OR ("auth"."uid"() = "user_id")));

CREATE POLICY "Enable read access for own rooms" ON "public"."participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable read access for user to their own relationships" ON "public"."relationships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_a") OR ("auth"."uid"() = "user_b")));

CREATE POLICY "Enable update for users of own id" ON "public"."rooms" FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE "public"."logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_account" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "id"));

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_unique" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_unique" boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."create_dm_room"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_dm_room"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_dm_room"() TO "service_role";

GRANT ALL ON FUNCTION "public"."create_friendship_and_room_for_user"("p_new_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_friendship_and_room_for_user"("p_new_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_friendship_and_room_for_user"("p_new_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_room_and_participants_on_friendship_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_room_and_participants_on_friendship_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_room_and_participants_on_friendship_delete"() TO "service_role";

GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_goals_by_user_ids"("query_user_ids" "uuid"[], "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_goals_by_user_ids"("query_user_ids" "uuid"[], "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_goals_by_user_ids"("query_user_ids" "uuid"[], "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_count" integer, "query_unique" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_count" integer, "query_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_user_ids" "uuid"[], "query_count" integer, "query_unique" boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_recent_rows_per_user"("query_table_name" "text", "array_of_uuid_arrays" "uuid"[], "n_rows_per_user" integer, "timestamp_column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_rows_per_user"("query_table_name" "text", "array_of_uuid_arrays" "uuid"[], "n_rows_per_user" integer, "timestamp_column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_rows_per_user"("query_table_name" "text", "array_of_uuid_arrays" "uuid"[], "n_rows_per_user" integer, "timestamp_column_name" "text") TO "service_role";

GRANT ALL ON TABLE "public"."relationships" TO "anon";
GRANT ALL ON TABLE "public"."relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."relationships" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."is_user_participant_in_room"("p_user_id" "uuid", "p_room_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_participant_in_room"("p_user_id" "uuid", "p_room_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_participant_in_room"("p_user_id" "uuid", "p_room_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_user_ids" "uuid"[]) TO "service_role";

GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";

GRANT ALL ON TABLE "public"."descriptions" TO "anon";
GRANT ALL ON TABLE "public"."descriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptions" TO "service_role";

GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";

GRANT ALL ON TABLE "public"."lore" TO "anon";
GRANT ALL ON TABLE "public"."lore" TO "authenticated";
GRANT ALL ON TABLE "public"."lore" TO "service_role";

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";

GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";

GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";

GRANT ALL ON TABLE "public"."facts" TO "anon";
GRANT ALL ON TABLE "public"."facts" TO "authenticated";
GRANT ALL ON TABLE "public"."facts" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
