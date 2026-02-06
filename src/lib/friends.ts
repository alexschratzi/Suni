import { supabase } from "@/src/lib/supabase";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { getOrCreateDmThread } from "@/src/lib/dmThreads";

export const pairFor = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

export type FriendRequestState = {
  blockedByOther: boolean;
  blockedByMe: boolean;
  existingFriend: boolean;
  outgoingReq: boolean;
  incomingReq: boolean;
};

export type SendFriendRequestStatus =
  | "sent"
  | "blockedByOther"
  | "blockedByMe"
  | "alreadyFriends"
  | "pendingSent"
  | "pendingReceived";

export type AcceptFriendRequestStatus = "ok" | "alreadyFriends";

export type BlockUserStatus = "blocked" | "alreadyBlocked";

export const checkFriendRequestState = async (
  userId: string,
  targetUid: string
): Promise<FriendRequestState> => {
  const [blockedByOther, blockedByMe, existingFriend, outgoingReq, incomingReq] =
    await Promise.all([
      supabase
        .from(TABLES.blocks)
        .select("id")
        .eq(COLUMNS.blocks.blockerId, targetUid)
        .eq(COLUMNS.blocks.blockedId, userId)
        .maybeSingle(),
      supabase
        .from(TABLES.blocks)
        .select("id")
        .eq(COLUMNS.blocks.blockerId, userId)
        .eq(COLUMNS.blocks.blockedId, targetUid)
        .maybeSingle(),
      (() => {
        const [a, b] = pairFor(userId, targetUid);
        return supabase
          .from(TABLES.friendships)
          .select("id")
          .eq(COLUMNS.friendships.userId, a)
          .eq(COLUMNS.friendships.friendId, b)
          .maybeSingle();
      })(),
      supabase
        .from(TABLES.friendRequests)
        .select("id")
        .eq(COLUMNS.friendRequests.fromUser, userId)
        .eq(COLUMNS.friendRequests.toUser, targetUid)
        .maybeSingle(),
      supabase
        .from(TABLES.friendRequests)
        .select("id")
        .eq(COLUMNS.friendRequests.fromUser, targetUid)
        .eq(COLUMNS.friendRequests.toUser, userId)
        .maybeSingle(),
    ]);

  return {
    blockedByOther: !!blockedByOther.data,
    blockedByMe: !!blockedByMe.data,
    existingFriend: !!existingFriend.data,
    outgoingReq: !!outgoingReq.data,
    incomingReq: !!incomingReq.data,
  };
};

export const sendFriendRequest = async (
  userId: string,
  targetUid: string
): Promise<SendFriendRequestStatus> => {
  const state = await checkFriendRequestState(userId, targetUid);

  if (state.blockedByOther) return "blockedByOther";
  if (state.blockedByMe) return "blockedByMe";
  if (state.existingFriend) return "alreadyFriends";
  if (state.outgoingReq) return "pendingSent";
  if (state.incomingReq) return "pendingReceived";

  const { error } = await supabase.from(TABLES.friendRequests).insert({
    [COLUMNS.friendRequests.fromUser]: userId,
    [COLUMNS.friendRequests.toUser]: targetUid,
  });

  if (error) {
    throw error;
  }

  return "sent";
};

export const acceptFriendRequest = async (
  userId: string,
  otherUid: string
): Promise<AcceptFriendRequestStatus> => {
  const [a, b] = pairFor(userId, otherUid);
  const existing = await supabase
    .from(TABLES.friendships)
    .select("id")
    .eq(COLUMNS.friendships.userId, a)
    .eq(COLUMNS.friendships.friendId, b)
    .maybeSingle();

  if (existing.data) {
    return "alreadyFriends";
  }

  const { error: insertErr } = await supabase.from(TABLES.friendships).insert({
    [COLUMNS.friendships.userId]: a,
    [COLUMNS.friendships.friendId]: b,
  });
  if (insertErr) throw insertErr;

  const { error: deleteErr } = await supabase
    .from(TABLES.friendRequests)
    .delete()
    .eq(COLUMNS.friendRequests.fromUser, otherUid)
    .eq(COLUMNS.friendRequests.toUser, userId);
  if (deleteErr) throw deleteErr;

  await getOrCreateDmThread(userId, otherUid);

  return "ok";
};

export const declineFriendRequest = async (userId: string, otherUid: string) => {
  const { error } = await supabase
    .from(TABLES.friendRequests)
    .delete()
    .eq(COLUMNS.friendRequests.fromUser, otherUid)
    .eq(COLUMNS.friendRequests.toUser, userId);
  if (error) throw error;
};

export const blockUser = async (
  userId: string,
  targetUid: string
): Promise<BlockUserStatus> => {
  const { data: existingBlock } = await supabase
    .from(TABLES.blocks)
    .select("id")
    .eq(COLUMNS.blocks.blockerId, userId)
    .eq(COLUMNS.blocks.blockedId, targetUid)
    .maybeSingle();

  if (existingBlock) {
    return "alreadyBlocked";
  }

  const { error: blockErr } = await supabase.from(TABLES.blocks).insert({
    [COLUMNS.blocks.blockerId]: userId,
    [COLUMNS.blocks.blockedId]: targetUid,
  });
  if (blockErr) throw blockErr;

  const [a, b] = pairFor(userId, targetUid);
  await Promise.all([
    supabase
      .from(TABLES.friendships)
      .delete()
      .eq(COLUMNS.friendships.userId, a)
      .eq(COLUMNS.friendships.friendId, b),
    supabase
      .from(TABLES.friendRequests)
      .delete()
      .eq(COLUMNS.friendRequests.fromUser, userId)
      .eq(COLUMNS.friendRequests.toUser, targetUid),
    supabase
      .from(TABLES.friendRequests)
      .delete()
      .eq(COLUMNS.friendRequests.fromUser, targetUid)
      .eq(COLUMNS.friendRequests.toUser, userId),
  ]);

  return "blocked";
};

export const unblockUser = async (userId: string, targetUid: string) => {
  const { error } = await supabase
    .from(TABLES.blocks)
    .delete()
    .eq(COLUMNS.blocks.blockerId, userId)
    .eq(COLUMNS.blocks.blockedId, targetUid);
  if (error) throw error;
};
