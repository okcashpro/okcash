alter table "public"."accounts" alter column "id" set default auth.uid();

alter table "public"."descriptions" disable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_friendship_with_host_agent()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  host_agent_id UUID := '00000000-0000-0000-0000-000000000000';
  new_room_id UUID;
BEGIN
  -- Assuming NEW.id is the user ID of the newly inserted/updated row triggering this action
  -- Create a new room for the direct message between the new user and the host agent
  INSERT INTO rooms (created_by, name)
  VALUES (auth.uid(), 'Direct Message with Host Agent')
  RETURNING id INTO new_room_id;

  -- Create a new friendship between the new user and the host agent
  INSERT INTO relationships (user_a, user_b, status, room_id, user_id)
  VALUES (auth.uid(), host_agent_id, 'FRIENDS', new_room_id, host_agent_id);

  -- Add both users as participants of the new room
  INSERT INTO participants (user_id, room_id)
  VALUES (auth.uid(), new_room_id), (host_agent_id, new_room_id);

  RETURN NEW; -- For AFTER triggers, or NULL for BEFORE triggers
END;
$function$
;

create policy "Enable read access for all users"
on "public"."relationships"
as permissive
for select
to authenticated
using (true);



