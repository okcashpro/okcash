alter table "public"."accounts" add column "register_complete" boolean not null;

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

    RETURN QUERY EXECUTE QUERY
    USING query_input, query_threshold, query_match_count;
END;
$function$
;


