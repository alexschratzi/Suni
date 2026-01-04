export const TABLES = {
  profiles: "profiles",
  usernames: "usernames",
  friendRequests: "friend_requests",
  friendships: "friendships",
  blocks: "blocks",
  dmThreads: "dm_threads",
  dmMessages: "dm_messages",
  roomMessages: "room_messages",
  roomReplies: "room_replies",
} as const;

export const COLUMNS = {
  profiles: {
    id: "id",
    username: "username",
    role: "role",
    settings: "settings",
  },
  usernames: {
    username: "username",
    userId: "uid",
  },
  friendRequests: {
    fromUser: "from_id",
    toUser: "to_id",
    createdAt: "created_at",
  },
  friendships: {
    userId: "user_a",
    friendId: "user_b",
    createdAt: "created_at",
  },
  blocks: {
    blockerId: "blocker_id",
    blockedId: "blocked_id",
    createdAt: "created_at",
  },
  dmThreads: {
    id: "id",
    userIds: "users",
    lastMessage: "last_message",
    lastTimestamp: "last_timestamp",
    hiddenBy: "hidden_by",
  },
  dmMessages: {
    id: "id",
    threadId: "thread_id",
    senderId: "sender",
    username: "username",
    text: "text",
    createdAt: "timestamp",
  },
  roomMessages: {
    id: "id",
    roomKey: "room",
    senderId: "sender",
    username: "username",
    text: "text",
    createdAt: "timestamp",
  },
  roomReplies: {
    id: "id",
    roomMessageId: "message_id",
    senderId: "sender",
    username: "username",
    text: "text",
    createdAt: "timestamp",
  },
} as const;
