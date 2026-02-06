# Supabase schema notes

These screens expect the following tables and columns. If your schema uses
different names, update `src/lib/supabaseTables.ts` to match.

profiles
- id (uuid, PK, auth user id)
- username (text)
- role (text)
- settings (jsonb)
- avatar_path (text, storage path)

SQL helpers
```
alter table profiles
  add column if not exists avatar_path text;
```

DM threads: enforce unique pair + helper RPCs
```
-- Ensure one thread per user pair.
alter table dm_threads
  add column if not exists user_a uuid,
  add column if not exists user_b uuid;

update dm_threads
set user_a = least(users[1], users[2]),
    user_b = greatest(users[1], users[2])
where (user_a is null or user_b is null)
  and array_length(users, 1) >= 2;

alter table dm_threads
  alter column user_a set not null,
  alter column user_b set not null;

alter table dm_threads
  add constraint dm_threads_user_pair_unique unique (user_a, user_b);

alter table dm_threads
  add constraint dm_threads_user_pair_check check (user_a < user_b);

create or replace function public.dm_threads_set_pair()
returns trigger
language plpgsql
as $$
begin
  if new.users is not null and array_length(new.users, 1) >= 2 then
    new.user_a := least(new.users[1], new.users[2]);
    new.user_b := greatest(new.users[1], new.users[2]);
  end if;
  return new;
end;
$$;

drop trigger if exists dm_threads_set_pair_before on dm_threads;
create trigger dm_threads_set_pair_before
before insert or update of users on dm_threads
for each row execute procedure public.dm_threads_set_pair();

-- RPC: get or create the unique thread for a pair (also unhide for caller).
create or replace function public.get_or_create_dm_thread(user_a uuid, user_b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
  thread_id uuid;
begin
  if user_a is null or user_b is null or user_a = user_b then
    raise exception 'invalid users';
  end if;

  a := least(user_a, user_b);
  b := greatest(user_a, user_b);

  insert into dm_threads (users, user_a, user_b, last_message, last_timestamp, hidden_by)
  values (array[a, b], a, b, '', null, '{}')
  on conflict (user_a, user_b)
  do update set hidden_by = array_remove(dm_threads.hidden_by, auth.uid())
  returning id into thread_id;

  return thread_id;
end;
$$;

grant execute on function public.get_or_create_dm_thread(uuid, uuid) to authenticated;

-- RPC: unread counts per thread for the current user.
create or replace function public.get_unread_dm_counts(p_user_id uuid default auth.uid())
returns table (thread_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    m.thread_id,
    count(*)::bigint as unread_count
  from dm_messages m
  join dm_threads t on t.id = m.thread_id
  left join dm_reads r
    on r.thread_id = m.thread_id
   and r.user_id = p_user_id
  where p_user_id = any(t.users)
    and m.sender <> p_user_id
    and (r.last_read_at is null or m.timestamp > r.last_read_at)
  group by m.thread_id;
$$;

grant execute on function public.get_unread_dm_counts(uuid) to authenticated;
```

usernames
- username (text)
- uid (uuid)

friend_requests
- from_id (uuid, FK -> profiles.id)
- to_id (uuid, FK -> profiles.id)
- created_at (timestamptz)

friendships
- user_a (uuid, FK -> profiles.id)
- user_b (uuid, FK -> profiles.id)
- created_at (timestamptz)

blocks
- blocker_id (uuid, FK -> profiles.id)
- blocked_id (uuid, FK -> profiles.id)
- created_at (timestamptz)

dm_threads
- id (uuid, PK)
- users (uuid[] , array of two user ids)
- user_a (uuid, lower user id for uniqueness)
- user_b (uuid, higher user id for uniqueness)
- last_message (text)
- last_timestamp (timestamptz)
- hidden_by (uuid[] optional)

dm_messages
- id (uuid, PK)
- thread_id (uuid, FK -> dm_threads.id)
- sender (uuid, FK -> profiles.id)
- username (text)
- text (text)
- timestamp (timestamptz)
- attachment_path (text)
- attachment_name (text)
- attachment_mime (text)
- attachment_size (bigint)

dm_reads
- thread_id (uuid, FK -> dm_threads.id)
- user_id (uuid, FK -> profiles.id)
- last_read_at (timestamptz)
- PK: (thread_id, user_id)

room_messages
- id (uuid, PK)
- room (text, e.g. salzburg/oesterreich/wirtschaft)
- sender (uuid, FK -> profiles.id)
- username (text)
- text (text)
- timestamp (timestamptz)
- attachment_path (text)
- attachment_name (text)
- attachment_mime (text)
- attachment_size (bigint)

room_replies
- id (uuid, PK)
- message_id (uuid, FK -> room_messages.id)
- sender (uuid, FK -> profiles.id)
- username (text)
- text (text)
- timestamp (timestamptz)
- attachment_path (text)
- attachment_name (text)
- attachment_mime (text)
- attachment_size (bigint)

room_reply_votes
- reply_id (uuid, FK -> room_replies.id)
- user_id (uuid, FK -> profiles.id)
- value (smallint, +1/-1)
- PK: (reply_id, user_id)

room_message_votes
- message_id (uuid, FK -> room_messages.id)
- user_id (uuid, FK -> profiles.id)
- value (smallint, +1/-1)
- PK: (message_id, user_id)

RLS
- Allow authenticated users to read `profiles.username` and `profiles.avatar_path`.
- Allow users to update their own `profiles` row (username/avatar_path).
- Allow users to read/write their own friend requests, friendships, blocks,
  DM threads/messages, and room messages/replies as needed.
- Allow users to read/write their own dm_reads rows (thread_id + user_id).
- Allow authenticated users to read room_reply_votes; allow users to insert/update/delete their own vote.
- Allow authenticated users to read room_message_votes; allow users to insert/update/delete their own vote.
Storage
- Bucket: chat_attachments (private; use signed URLs).
- Bucket: avatars (private; use signed URLs; store as `${auth.uid()}/filename`).

Avatars storage policy (example)
```
-- Allow authenticated users to read all avatars
create policy "avatars read"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

-- Allow users to manage files only in their own folder
create policy "avatars insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```
