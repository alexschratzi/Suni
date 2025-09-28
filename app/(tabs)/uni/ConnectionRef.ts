export type ConnectionRef = {
  connectionId: string;
  universityId: number;
  programId: number;
  status: "pending" | "ready" | "error" | "expired";
  lastSyncAt?: string;
};