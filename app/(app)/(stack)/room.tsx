import React from "react";
import { useLocalSearchParams } from "expo-router";
import RoomThreadScreen from "@/components/chat/RoomThreadScreen";

export default function RoomRoute() {
  const { room, roomTitle, accentColor, username } = useLocalSearchParams();
  const toSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const roomValue = toSingle(room);
  if (!roomValue) return null;

  return (
    <RoomThreadScreen
      room={roomValue}
      roomTitle={toSingle(roomTitle)}
      initialAccentColor={toSingle(accentColor)}
      initialUsername={toSingle(username)}
    />
  );
}
