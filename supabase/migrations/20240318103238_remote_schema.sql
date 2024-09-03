
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'fuzzystrmatch'
    ) THEN
        CREATE EXTENSION fuzzystrmatch
        SCHEMA extensions;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."secrets" (
    "key" "text" PRIMARY KEY,
    "value" "text" NOT NULL
);

ALTER TABLE "public"."secrets" OWNER TO "postgres";

CREATE TABLE "public"."user_data" (
    owner_id INT,
    target_id INT,
    data JSONB,
    PRIMARY KEY (owner_id, target_id),
    FOREIGN KEY (owner_id) REFERENCES accounts(id),
    FOREIGN KEY (target_id) REFERENCES accounts(id)
);

ALTER TABLE "public"."user_data" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."after_account_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'extensions', 'public', 'pg_temp'
    AS $$
DECLARE
  response RECORD; -- Define response with the expected return type
  newuser_url TEXT;
  token TEXT;
BEGIN
  -- Retrieve the newuser URL and token from the secrets table
  SELECT value INTO newuser_url FROM secrets WHERE key = 'newuser_url';
  SELECT value INTO token FROM secrets WHERE key = 'token';

  -- Ensure newuser_url and token are both defined and not empty
  IF newuser_url IS NOT NULL AND newuser_url <> '' AND token IS NOT NULL AND token <> '' THEN
    -- Make the HTTP POST request to the endpoint
    SELECT * INTO response FROM http_post(
      newuser_url,
      jsonb_build_object(
        'token', token,
        'user_id', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."after_account_created"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."check_similarity_and_insert"("query_table_name" "text", "query_user_id" "uuid", "query_content" "jsonb", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "query_created_at" "timestamp with time zone")
RETURNS "void"
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
                'FROM memories ' ||
                'WHERE user_id = %L ' ||
                'AND room_id = %L ' ||
                'AND type = %L ' ||  -- Filter by the 'type' field using query_table_name
                'AND embedding <=> %L < %L ' ||
                'LIMIT 1' ||
            ')',
            query_user_id,
            query_room_id,
            query_table_name,  -- Use query_table_name to filter by 'type'
            query_embedding,
            similarity_threshold
        );

        -- Execute the query to check for similarity
        EXECUTE select_query INTO similar_found;
    END IF;

    -- Prepare the insert query with 'unique' field set based on the presence of similar records or NULL query_embedding
    insert_query := format(
        'INSERT INTO memories (user_id, content, room_id, type, embedding, "unique", created_at) ' ||  -- Insert into the 'memories' table
        'VALUES (%L, %L, %L, %L, %L, %L, %L)',
        query_user_id,
        query_content,
        query_room_id,
        query_table_name,  -- Use query_table_name as the 'type' value
        query_embedding,
        NOT similar_found OR query_embedding IS NULL  -- Set 'unique' to true if no similar record is found or query_embedding is NULL
    );

    -- Execute the insert query
    EXECUTE insert_query;
END;
$$;

ALTER FUNCTION "public"."check_similarity_and_insert"("query_table_name" "text", "query_user_id" "uuid", "query_content" "jsonb", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean DEFAULT false) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    query TEXT;
    total BIGINT;
BEGIN
    -- Initialize the base query
    query := format('SELECT COUNT(*) FROM memories WHERE type = %L', query_table_name);

    -- Add condition for room_id if not null, ensuring proper spacing
    IF query_room_id IS NOT NULL THEN
        query := query || format(' AND room_id = %L', query_room_id);
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


ALTER FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_room"(room_id uuid)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if the room already exists
  IF EXISTS (SELECT 1 FROM rooms WHERE rooms.id = room_id) THEN
    RETURN QUERY SELECT rooms.id FROM rooms WHERE rooms.id = room_id;
  ELSE
    -- Create a new room with the provided room_id
    RETURN QUERY INSERT INTO rooms (id) VALUES (room_id) RETURNING rooms.id;
  END IF;
END;
$function$

ALTER FUNCTION "public"."create_room"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_friendship_with_host_agent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  host_agent_id UUID := '00000000-0000-0000-0000-000000000000';
  new_room_id UUID;
BEGIN
  -- Create a new room for the direct message between the new user and the host agent
  INSERT INTO rooms DEFAULT VALUES
  RETURNING id INTO new_room_id;

  -- Create a new friendship between the new user and the host agent
  INSERT INTO relationships (user_a, user_b, user_id, status)
  VALUES (NEW.id, host_agent_id, host_agent_id, 'FRIENDS');

  -- Add both users as participants of the new room
  INSERT INTO participants (user_id, room_id)
  VALUES (NEW.id, new_room_id), (host_agent_id, new_room_id);

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_friendship_with_host_agent"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."fn_notify_agents"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  participant RECORD;
  agent_flag BOOLEAN;
  response RECORD;
  payload TEXT;
  message_url TEXT;
  token TEXT;
BEGIN
  -- Retrieve the message URL and token from the secrets table
  SELECT value INTO message_url FROM secrets WHERE key = 'message_url';
  SELECT value INTO token FROM secrets WHERE key = 'token';

  -- Iterate over the participants of the room
  FOR participant IN (
    SELECT p.user_id
    FROM participants p
    WHERE p.room_id = NEW.room_id
  )
  LOOP
    -- Check if the participant is an agent
    SELECT is_agent INTO agent_flag FROM accounts WHERE id = participant.user_id;

    -- Add a condition to ensure the sender is not the agent
    IF agent_flag AND NEW.user_id <> participant.user_id THEN
      -- Construct the payload JSON object and explicitly cast to TEXT
      payload := jsonb_build_object(
        'token', token,
        'senderId', NEW.user_id::text,
        'content', NEW.content,
        'room_id', NEW.room_id::text
      )::text;

      -- Make the HTTP POST request to the Cloudflare worker endpoint
      SELECT * INTO response FROM http_post(
        message_url,
        payload,
        'application/json'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;



ALTER FUNCTION "public"."fn_notify_agents"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer)
RETURNS TABLE("embedding" "extensions"."vector", "levenshtein_score" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
    QUERY TEXT;
BEGIN
    -- Check the length of query_input
    IF LENGTH(query_input) > 255 THEN
        -- For inputs longer than 255 characters, use exact match only
        QUERY := format('
            SELECT
                embedding
            FROM
                memories
            WHERE
                type = $1 AND
                (content->>''%s'')::TEXT = $2
            LIMIT
                $3
        ', query_field_name);
        -- Execute the query with adjusted parameters for exact match
        RETURN QUERY EXECUTE QUERY USING query_table_name, query_input, query_match_count;
    ELSE
        -- For inputs of 255 characters or less, use Levenshtein distance
        QUERY := format('
            SELECT
                embedding,
                levenshtein($2, (content->>''%s'')::TEXT) AS levenshtein_score
            FROM
                memories
            WHERE
                type = $1 AND
                levenshtein($2, (content->>''%s'')::TEXT) <= $3
            ORDER BY
                levenshtein_score
            LIMIT
                $4
        ', query_field_name, query_field_name);
        -- Execute the query with original parameters for Levenshtein distance
        RETURN QUERY EXECUTE QUERY USING query_table_name, query_input, query_threshold, query_match_count;
    END IF;
END;
$$;

ALTER FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "room_id" "uuid",
    "status" "text",
    "name" "text",
    "objectives" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL
);

ALTER TABLE "public"."goals" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid" DEFAULT NULL::"uuid", "only_in_progress" boolean DEFAULT true, "row_count" integer DEFAULT 5) RETURNS SETOF "public"."goals"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM goals
    WHERE
        (query_user_id IS NULL OR user_id = query_user_id)
        AND (room_id = query_room_id)
        AND (NOT only_in_progress OR status = 'IN_PROGRESS')
    LIMIT row_count;
END;
$$;

ALTER FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean DEFAULT false, "query_user_ids" "uuid"[] DEFAULT NULL) 
RETURNS TABLE("id" "uuid", "user_id" "uuid", "content" "jsonb", "created_at" timestamp with time zone, "room_id" "uuid", "embedding" "extensions"."vector")
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
            room_id,
            embedding
        FROM memories
        WHERE TRUE
        AND type = %L
        %s -- Additional condition for 'unique' column based on query_unique
        %s -- Additional condition for room_id based on query_room_id
        %s -- Additional condition for user_id based on query_user_ids
        ORDER BY created_at DESC
        LIMIT %L
        $fmt$,
        query_table_name,
        CASE WHEN query_unique THEN ' AND "unique" IS TRUE' ELSE '' END,
        CASE WHEN query_room_id IS NOT NULL THEN format(' AND room_id = %L', query_room_id) ELSE '' END,
        CASE WHEN query_user_ids IS NOT NULL THEN format(' AND user_id = ANY(ARRAY[%s])', array_to_string(query_user_ids, ',')) ELSE '' END,
        query_count
    );

    RETURN QUERY EXECUTE query;
END;
$_$;

ALTER FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean, "query_user_ids" "uuid"[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_message_count"("p_user_id" "uuid") RETURNS TABLE("room_id" "uuid", "unread_messages_count" integer)
    LANGUAGE "plpgsql"
    AS $$BEGIN
  RETURN QUERY
  SELECT p.room_id, COALESCE(COUNT(m.id)::integer, 0) AS unread_messages_count
  FROM participants p
  LEFT JOIN memories m ON p.room_id = m.room_id AND m.type = "messages"
  WHERE p.user_id = p_user_id
  GROUP BY p.room_id;
END;
$$;

ALTER FUNCTION "public"."get_message_count"("p_user_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."relationships" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "user_a" "uuid",
    "user_b" "uuid",
    "status" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
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

CREATE OR REPLACE FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$DECLARE
    dynamic_query TEXT;
BEGIN
    dynamic_query := format('DELETE FROM memories WHERE room_id = $1 AND type = $2');
    EXECUTE dynamic_query USING query_room_id, query_table_name;
END;
$_$;


ALTER FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."search_memories"("query_table_name" "text", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "query_match_threshold" double precision, "query_match_count" integer, "query_unique" boolean)
RETURNS TABLE("id" "uuid", "user_id" "uuid", "content" "jsonb", "created_at" timestamp with time zone, "similarity" double precision, "room_id" "uuid", "embedding" "extensions"."vector")
LANGUAGE "plpgsql"
AS $$
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
            room_id,
            embedding
        FROM memories
        WHERE (1 - (embedding <=> %L) > %L)
        AND type = %L
        %s -- Additional condition for 'unique' column
        %s -- Additional condition for 'room_id'
        ORDER BY similarity DESC
        LIMIT %L
        $fmt$,
        query_embedding,
        query_embedding,
        query_match_threshold,
        query_table_name,
        CASE WHEN query_unique THEN ' AND "unique" IS TRUE' ELSE '' END,
        CASE WHEN query_room_id IS NOT NULL THEN format(' AND room_id = %L', query_room_id) ELSE '' END,
        query_match_count
    );

    RETURN QUERY EXECUTE query;
END;
$$;



ALTER FUNCTION "public"."search_memories"("query_table_name" "text", "query_room_id" "uuid", "query_embedding" "extensions"."vector", "query_match_threshold" double precision, "query_match_count" integer, "query_unique" boolean) OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "name" "text",
    "username" "text",
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "is_agent" boolean DEFAULT false NOT NULL,
    "location" "text",
    "profile_line" "text",
    "signed_tos" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."accounts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "jsonb" NOT NULL,
    "type" "text" NOT NULL,
    "room_id" "uuid"
);

ALTER TABLE "public"."logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."memories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb" NOT NULL,
    "embedding" "extensions"."vector" NOT NULL,
    "user_id" "uuid",
    "room_id" "uuid",
    "unique" boolean DEFAULT true NOT NULL,
    "type" "text" NOT NULL
);

ALTER TABLE "public"."memories" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."participants" (
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "user_id" "uuid",
    "room_id" "uuid",
    "user_state" "text" DEFAULT NULL, -- Add user_state field to track MUTED, NULL, or FOLLOWED
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "last_message_read" "uuid",
    FOREIGN KEY ("user_id") REFERENCES "accounts"("id"),
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_participant_user_state"("room_id" "uuid", "user_id" "uuid")
RETURNS "text"
LANGUAGE "plpgsql"
AS $$
BEGIN
    RETURN (
        SELECT user_state
        FROM participants
        WHERE room_id = $1 AND user_id = $2
    );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_participant_user_state"("room_id" "uuid", "user_id" "uuid", "state" "text")
RETURNS "void"
LANGUAGE "plpgsql"
AS $$
BEGIN
    UPDATE participants
    SET user_state = $3
    WHERE room_id = $1 AND user_id = $2;
END;
$$;

CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL
);

ALTER TABLE "public"."rooms" OWNER TO "postgres";

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "friendships_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE OR REPLACE TRIGGER "trigger_after_account_created" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."after_account_created"();

CREATE OR REPLACE TRIGGER "trigger_create_friendship_with_host_agent" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."create_friendship_with_host_agent"();

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");

ALTER TABLE ONLY "public"."memories"
    ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id");

CREATE POLICY "Can select and update all data" ON "public"."accounts" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Enable delete for users based on user_id" ON "public"."goals" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."accounts" FOR INSERT TO "authenticated", "anon", "service_role", "supabase_replication_admin", "supabase_read_only_user" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."goals" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."logs" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."participants" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."relationships" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_a") OR ("auth"."uid"() = "user_b")));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."rooms" FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for self id" ON "public"."participants" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable read access for all users" ON "public"."accounts" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."goals" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."relationships" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."rooms" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Enable read access for own rooms" ON "public"."participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable read access for user to their own relationships" ON "public"."relationships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_a") OR ("auth"."uid"() = "user_b")));

CREATE POLICY "Enable update for users based on email" ON "public"."goals" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Enable update for users of own id" ON "public"."rooms" FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable users to delete their own relationships/friendships" ON "public"."relationships" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_a") OR ("auth"."uid"() = "user_b")));

ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."memories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."relationships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_account" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "id"));

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_admin";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."after_account_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_account_created"() TO "service_role";
GRANT ALL ON FUNCTION "public"."after_account_created"() TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."after_account_created"() TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean) TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."count_memories"("query_table_name" "text", "query_room_id" "uuid", "query_unique" boolean) TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."create_friendship_with_host_agent"() TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."fn_notify_agents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notify_agents"() TO "service_role";
GRANT ALL ON FUNCTION "public"."fn_notify_agents"() TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."fn_notify_agents"() TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer) TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_embedding_list"("query_table_name" "text", "query_threshold" integer, "query_input" "text", "query_field_name" "text", "query_field_sub_name" "text", "query_match_count" integer) TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";
GRANT ALL ON TABLE "public"."goals" TO "supabase_admin";
GRANT ALL ON TABLE "public"."goals" TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_goals"("query_room_id" "uuid", "query_user_id" "uuid", "only_in_progress" boolean, "row_count" integer) TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean) TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_memories"("query_table_name" "text", "query_room_id" "uuid", "query_count" integer, "query_unique" boolean) TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_message_count"("p_user_id" "uuid") TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."relationships" TO "service_role";
GRANT ALL ON TABLE "public"."relationships" TO "supabase_admin";
GRANT ALL ON TABLE "public"."relationships" TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_relationship"("usera" "uuid", "userb" "uuid") TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."remove_memories"("query_table_name" "text", "query_room_id" "uuid") TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."accounts" TO "authenticator";
GRANT ALL ON TABLE "public"."accounts" TO "supabase_admin";
GRANT ALL ON TABLE "public"."accounts" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";
GRANT ALL ON TABLE "public"."logs" TO "supabase_admin";
GRANT ALL ON TABLE "public"."logs" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."memories" TO "authenticated";
GRANT ALL ON TABLE "public"."memories" TO "service_role";
GRANT ALL ON TABLE "public"."memories" TO "supabase_admin";
GRANT ALL ON TABLE "public"."memories" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";
GRANT ALL ON TABLE "public"."participants" TO "supabase_admin";
GRANT ALL ON TABLE "public"."participants" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";
GRANT ALL ON TABLE "public"."rooms" TO "supabase_admin";
GRANT ALL ON TABLE "public"."rooms" TO "supabase_auth_admin";

GRANT ALL ON TABLE "public"."secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."secrets" TO "service_role";
GRANT ALL ON TABLE "public"."secrets" TO "supabase_admin";
GRANT ALL ON TABLE "public"."secrets" TO "supabase_auth_admin";


GRANT ALL ON FUNCTION "public"."get_participant_user_state"("room_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_participant_user_state"("room_id" "uuid", "user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_participant_user_state"("room_id" "uuid", "user_id" "uuid") TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."get_participant_user_state"("room_id" "uuid", "user_id" "uuid") TO "supabase_auth_admin";

GRANT ALL ON FUNCTION "public"."set_participant_user_state"("room_id" "uuid", "user_id" "uuid", "state" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_participant_user_state"("room_id" "uuid", "user_id" "uuid", "state" "text") TO "service_role";  
GRANT ALL ON FUNCTION "public"."set_participant_user_state"("room_id" "uuid", "user_id" "uuid", "state" "text") TO "supabase_admin";
GRANT ALL ON FUNCTION "public"."set_participant_user_state"("room_id" "uuid", "user_id" "uuid", "state" "text") TO "supabase_auth_admin";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "supabase_admin";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "supabase_auth_admin";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "supabase_admin";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "supabase_auth_admin";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "supabase_admin";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "supabase_auth_admin";

RESET ALL;