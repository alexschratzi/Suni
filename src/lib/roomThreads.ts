import { supabase } from "@/src/lib/supabase";

export type RoomThreadRow = {
  thread_key: string;
  thread_number?: number | null;
  title: string;
  subtitle?: string | null;
  is_visible?: boolean;
};

export const fetchVisibleRoomThreads = async () => {
  const { data, error } = await supabase.rpc("get_visible_room_threads");

  if (error) {
    throw error;
  }

  return (data as RoomThreadRow[] | null | undefined) ?? [];
};

export const searchRoomThreads = async (query: string) => {
  const { data, error } = await supabase.rpc("search_room_threads", {
    p_query: query,
  });

  if (error) {
    throw error;
  }

  return (data as RoomThreadRow[] | null | undefined) ?? [];
};

export const subscribeRoomThread = async (threadKey: string) => {
  const { error } = await supabase.rpc("subscribe_room_thread", {
    p_thread_key: threadKey,
  });

  if (error) {
    throw error;
  }
};
