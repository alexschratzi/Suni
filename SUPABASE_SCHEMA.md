# Supabase schema notes

These screens expect the following tables and columns. If your schema uses
different names, update `src/lib/supabaseTables.ts` to match.

profiles
- id (uuid, PK, auth user id)
- username (text)
- role (text)
- settings (jsonb)

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

room_messages
- id (uuid, PK)
- room (text, e.g. salzburg/oesterreich/wirtschaft)
- sender (uuid, FK -> profiles.id)
- username (text)
- text (text)
- timestamp (timestamptz)

room_replies
- id (uuid, PK)
- message_id (uuid, FK -> room_messages.id)
- sender (uuid, FK -> profiles.id)
- username (text)
- text (text)
- timestamp (timestamptz)

RLS
- Allow authenticated users to read `profiles.username`.
- Allow users to read/write their own friend requests, friendships, blocks,
  DM threads/messages, and room messages/replies as needed.
