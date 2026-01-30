// app/(app)/(stack)/reply.tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import DirectReplyScreen from "@/components/reply/DirectReplyScreen";
import ThreadReplyScreen from "@/components/reply/ThreadReplyScreen";

export default function ReplyScreen() {
  const {
    room,
    messageId,
    messageText,
    messageUser,
    messageUserId,
    dmId,
    otherUid,
    otherName,
    messageAttachmentPath,
    messageAttachmentName,
  } = useLocalSearchParams();
  const toSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const dmIdValue = toSingle(dmId);
  const roomValue = toSingle(room);
  const messageIdValue = toSingle(messageId);
  const otherUidValue = toSingle(otherUid);
  const otherNameValue = toSingle(otherName);
  const messageUserIdValue = toSingle(messageUserId);
  const messageAttachmentPathValue = toSingle(messageAttachmentPath);
  const messageAttachmentNameValue = toSingle(messageAttachmentName);

  if (dmIdValue) {
    return (
      <DirectReplyScreen
        dmId={dmIdValue}
        otherUid={otherUidValue}
        otherName={otherNameValue}
      />
    );
  }

  return (
    <ThreadReplyScreen
      roomId={roomValue}
      messageId={messageIdValue}
      messageText={toSingle(messageText)}
      messageUser={toSingle(messageUser)}
      messageUserId={messageUserIdValue}
      messageAttachmentPath={messageAttachmentPathValue}
      messageAttachmentName={messageAttachmentNameValue}
    />
  );
}
