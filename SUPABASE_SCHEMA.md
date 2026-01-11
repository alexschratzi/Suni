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
