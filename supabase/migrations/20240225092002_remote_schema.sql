create policy "Enable delete for users based on user_id"
on "public"."goals"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Enable insert for authenticated users only"
on "public"."goals"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."goals"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."goals"
as permissive
for update
to authenticated
using (true)
with check (true);



