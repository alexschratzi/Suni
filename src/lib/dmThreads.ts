import { supabase } from "@/src/lib/supabase";

type UnreadCountRow = {
  thread_id: string;
  unread_count: number;
};

export const getOrCreateDmThread = async (userId: string, otherUid: string) => {
  const { data, error } = await supabase.rpc("get_or_create_dm_thread", {
    user_a: userId,
    user_b: otherUid,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Missing DM thread id");
  }

  return data as string;
};

export const fetchUnreadDmCounts = async () => {
  const { data, error } = await supabase.rpc("get_unread_dm_counts");

  if (error) {
    throw error;
  }

  const map: Record<string, number> = {};
  (data as UnreadCountRow[] | null | undefined)?.forEach((row) => {
    if (!row?.thread_id) return;
    map[row.thread_id] = Number(row.unread_count ?? 0);
  });

  return map;
};
