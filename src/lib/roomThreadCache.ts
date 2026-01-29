import AsyncStorage from "@react-native-async-storage/async-storage";

type CachedRoomMessage = {
  id: string;
  sender?: string;
  username?: string;
  text: string;
  timestamp?: any;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
};

type RoomCacheEntry = {
  cachedAt: number;
  messages: CachedRoomMessage[];
};

const CACHE_PREFIX = "roomThreadCache.v1:";
const MAX_MESSAGES = 80;
const memoryCache = new Map<string, RoomCacheEntry>();

const now = () => Date.now();

export const getRoomMessagesCache = (room: string) => {
  const entry = memoryCache.get(room);
  return entry?.messages ?? null;
};

export const loadRoomMessagesCache = async (room: string) => {
  const memory = memoryCache.get(room);
  if (memory?.messages?.length) return memory.messages;

  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${room}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomCacheEntry;
    if (!parsed?.messages?.length) return null;

    memoryCache.set(room, parsed);
    return parsed.messages;
  } catch (err) {
    console.warn("Room cache hydrate failed:", err);
    return null;
  }
};

export const saveRoomMessagesCache = async (
  room: string,
  messages: CachedRoomMessage[]
) => {
  if (!room) return;
  const trimmed = messages.slice(0, MAX_MESSAGES);
  const entry: RoomCacheEntry = { cachedAt: now(), messages: trimmed };
  memoryCache.set(room, entry);

  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${room}`, JSON.stringify(entry));
  } catch (err) {
    console.warn("Room cache persist failed:", err);
  }
};
