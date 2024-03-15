create extension if not exists "fuzzystrmatch" with schema "extensions";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_embedding_list(query_table_name text, query_threshold integer, query_input text, query_field_name text, query_field_sub_name text, query_match_count integer)
 RETURNS TABLE(embedding vector, levenshtein_score integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    QUERY TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = query_table_name) THEN
        RAISE EXCEPTION 'Table % does not exist', query_table_name;
    END IF;

    -- Check the length of query_input
    IF LENGTH(query_input) > 255 THEN
        -- For inputs longer than 255 characters, use exact match only
        QUERY := format('
            SELECT
                embedding
            FROM
                %I
            WHERE
                (content->>''%s'')::TEXT = $1
            LIMIT
                $2
        ', query_table_name, query_field_name);
        -- Execute the query with adjusted parameters for exact match
        RETURN QUERY EXECUTE QUERY USING query_input, query_match_count;
    ELSE
        -- For inputs of 255 characters or less, use Levenshtein distance
        QUERY := format('
            SELECT
                embedding,
                levenshtein($1, (content->>''%s'')::TEXT) AS levenshtein_score
            FROM
                %I
            WHERE
                levenshtein($1, (content->>''%s'')::TEXT) <= $2
            ORDER BY
                levenshtein_score
            LIMIT
                $3
        ', query_field_name, query_table_name, query_field_name);
        -- Execute the query with original parameters for Levenshtein distance
        RETURN QUERY EXECUTE QUERY USING query_input, query_threshold, query_match_count;
    END IF;
END;
$function$
;