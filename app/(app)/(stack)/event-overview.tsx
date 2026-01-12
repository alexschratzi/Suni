// app/(app)/(stack)/event-overview.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Surface,
  Text,
  useTheme,
  type MD3Theme,
} from "react-native-paper";

import dayjs from "dayjs";

import type { EntryDisplayType, EvWithMeta } from "@/types/timetable";
import { useTimetableSync } from "@/src/timetable/hooks/useTimetableSync";
import { useTimetableEditor } from "@/src/timetable/hooks/useTimetableEditor";
import { makeTitleAbbr } from "@/src/timetable/utils/date";
import { EventEditorDrawer } from "@/components/timetable/EventEditorDrawer";

import { getNavEvent, clearNavEvent } from "@/src/timetable/utils/eventNavCache";

function fmt(iso: string) {
  try {
    return dayjs(iso).format("DD.MM.YYYY HH:mm");
  } catch {
    return iso;
  }
}

function typeLabel(t: EntryDisplayType) {
  if (t === "course") return "Course";
  if (t === "event") return "Event (Party)";
  return "None";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text variant="labelSmall">{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

export default function TimetableEventOverviewScreen() {
  const paper = useTheme<MD3Theme>();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const userId = "1234"; // TODO: real auth

  // ✅ Preload instantly from in-memory cache
  const [preloaded, setPreloaded] = useState<EvWithMeta | null>(() => {
    if (!id) return null;
    return getNavEvent(id) ?? null;
  });

  const { events, setEvents, icalMeta, setIcalMeta, refresh } = useTimetableSync({ userId });

  const editor = useTimetableEditor({
    userId,
    events,
    setEvents,
    icalMeta,
    setIcalMeta,
    makeTitleAbbr,
  });

  // Resolve the authoritative event from sync state once it exists
  const synced = useMemo(() => {
    if (!id) return null;
    return events.find((e) => e.id === id) ?? null;
  }, [events, id]);

  // Prefer synced data when available, otherwise show preloaded snapshot
  const ev = synced ?? preloaded;

  // Once synced is available, update preloaded (and optionally clear cache)
  useEffect(() => {
    if (!id) return;
    if (synced) {
      setPreloaded(synced);
      clearNavEvent(id);
    }
  }, [id, synced]);

  // If user lands here without cached data (deep link / cold start), do a refresh
  useEffect(() => {
    if (!id) return;
    if (!preloaded && !synced) {
      refresh().catch(() => {});
    }
  }, [id, preloaded, refresh, synced]);

  const displayType: EntryDisplayType = (ev?.displayType ?? "none") as EntryDisplayType;

  const courseFields = useMemo(() => {
    const name = ev?.fullTitle ?? ev?.title ?? "Course";
    return {
      courseName: name,
      courseType: name,
      lecturer: name,
      room: name,
    };
  }, [ev]);

  const partyFields = useMemo(() => {
    const eventName = ev?.party?.eventName ?? (ev?.fullTitle ?? ev?.title ?? "Event");
    return {
      eventName,
      location: ev?.party?.location ?? "-",
      createdBy: ev?.party?.createdBy ?? "-",
      entryFee: ev?.party?.entryFee ?? "-",
      invitedGroups: ev?.party?.invitedGroups?.length ? ev.party.invitedGroups.join(", ") : "-",
      friendsAttending: ev?.party?.friendsAttending?.length ? ev.party.friendsAttending.join(", ") : "-",
    };
  }, [ev]);

  const onHide = useCallback(async () => {
    if (!ev) return;

    setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, hidden: true } : e)));
    router.back();
    await refresh().catch(() => {});
  }, [ev, refresh, router, setEvents]);

  const onEdit = useCallback(() => {
    if (!ev) return;
    editor.openEditorForEvent(ev, { creating: false });
  }, [editor, ev]);

  if (!id) {
    return (
      <Surface style={[styles.root, { backgroundColor: paper.colors.background }]}>
        <Text variant="titleMedium">Missing event id</Text>
      </Surface>
    );
  }

  if (!ev) {
    return (
      <Surface style={[styles.root, { backgroundColor: paper.colors.background }]}>
        <View style={{ padding: 16 }}>
          <Text variant="titleLarge">Loading…</Text>
          <Text variant="bodyMedium" style={{ color: paper.colors.onSurfaceVariant, marginTop: 6 }}>
            Fetching entry details.
          </Text>
          <Button style={{ marginTop: 12 }} mode="outlined" onPress={() => router.back()}>
            Back
          </Button>
        </View>
      </Surface>
    );
  }

  const fullTitle = ev.fullTitle ?? ev.title ?? "";
  const titleAbbr = ev.titleAbbr ?? ev.title ?? "";
  const fromIso = ev.start?.dateTime ?? "";
  const untilIso = ev.end?.dateTime ?? "";
  const note = ev.note ?? "";
  const color = ev.color ?? "#4dabf7";

  return (
    <Surface style={[styles.root, { backgroundColor: paper.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleLarge">{fullTitle || "Untitled"}</Text>
        <Text variant="bodySmall" style={{ color: paper.colors.onSurfaceVariant, marginTop: 4 }}>
          {typeLabel(displayType)}
        </Text>

        {displayType === "none" && (
          <>
            <Row label="Title (full)" value={fullTitle} />
            <Row label="Title (abbr.)" value={titleAbbr} />
            <Row label="From" value={fmt(fromIso)} />
            <Row label="Until" value={fmt(untilIso)} />
            <Row label="Note" value={note || "-"} />
            <Row label="Color" value={color} />
          </>
        )}

        {displayType === "course" && (
          <>
            <Row label="Course Name" value={courseFields.courseName} />
            <Row label="Course Type" value={courseFields.courseType} />
            <Row label="Lecturer" value={courseFields.lecturer} />
            <Row label="Room" value={courseFields.room} />
            <Text variant="bodySmall" style={{ marginTop: 10, color: paper.colors.onSurfaceVariant }}>
              TODO: Add the algorithm for extracting these fields from iCal subscriptions (ICS data).
              For now everything is shown as “Course Name”.
            </Text>
          </>
        )}

        {displayType === "event" && (
          <>
            <Row label="Event Name" value={partyFields.eventName} />
            <Row label="Location" value={partyFields.location} />
            <Row label="Event Created By" value={partyFields.createdBy} />
            <Row label="Entry fee" value={partyFields.entryFee} />
            <Row label="Invited Groups" value={partyFields.invitedGroups} />
            <Row label="Friends who are attending" value={partyFields.friendsAttending} />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Button mode="outlined" onPress={() => {}}>
                Attend Event
              </Button>
              <Button mode="outlined" onPress={() => {}}>
                Invite Friend
              </Button>
            </View>
          </>
        )}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <Button onPress={onHide} textColor={paper.colors.error}>
            Hide
          </Button>
          <Button mode="contained" onPress={onEdit}>
            Edit
          </Button>
        </View>
      </ScrollView>

      {/* Editor sidebar over overview */}
      <EventEditorDrawer
        visible={!!editor.editingEvent && !!editor.editorForm}
        paper={paper}
        editingEvent={editor.editingEvent}
        form={editor.editorForm}
        activePicker={editor.activePicker}
        isIcalEditing={editor.isIcalEditing}
        isCreatingNew={editor.isCreatingNew}
        isDirty={editor.isDirty}
        onRequestClose={editor.requestCloseEditor}
        onDiscardChanges={editor.discardEditorChanges}
        onSave={editor.saveEditor}
        onDelete={editor.deleteEditorEvent}
        onChangeFullTitle={editor.onChangeFullTitle}
        onChangeTitleAbbr={editor.onChangeTitleAbbr}
        onChangeNote={(text) => editor.updateForm({ note: text })}
        onSelectColor={(c) => editor.updateForm({ color: c })}
        onSelectDisplayType={(t) => editor.updateForm({ displayType: t })}
        onChangeCourseField={(patch) => editor.updateForm(patch as any)}
        onChangePartyField={(patch) => editor.updateForm(patch as any)}
        onSetActivePicker={editor.setActivePicker}
        onPickerChange={editor.handlePickerChange}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
});
