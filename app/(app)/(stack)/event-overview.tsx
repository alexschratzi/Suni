// app/(app)/(stack)/event-overview.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Surface, Text, useTheme, type MD3Theme } from "react-native-paper";

import dayjs from "dayjs";

import type { EntryDisplayType, EvWithMeta } from "@/types/timetable";
import { useTimetableSync } from "@/src/timetable/hooks/useTimetableSync";
import { useTimetableEditor } from "@/src/timetable/hooks/useTimetableEditor";
import { makeTitleAbbr } from "@/src/timetable/utils/date";
import { EventEditorDrawer } from "@/components/timetable/EventEditorDrawer";

import { getNavEvent, clearNavEvent } from "@/src/timetable/utils/eventNavCache";

function typeLabel(t: EntryDisplayType) {
  if (t === "course") return "Course";
  if (t === "event") return "Event";
  return "Calendar entry";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="labelSmall" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function fmtListOrDash(arr?: string[]) {
  return arr?.length ? arr.join(", ") : "-";
}

function fmtDateRange(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) return "-";
  const s = dayjs(startIso);
  const e = dayjs(endIso);
  if (!s.isValid() || !e.isValid()) return "-";

  const date = s.format("DD.MM.YYYY");
  const from = s.format("HH:mm");
  const until = e.format("HH:mm");
  return `${date}, ${from} - ${until}`;
}

function nonEmptyOr(value: unknown, fallback: string) {
  const v = String(value ?? "").trim();
  return v ? v : fallback;
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

  // Resolve authoritative event from sync state once it exists
  const synced = useMemo(() => {
    if (!id) return null;
    return events.find((e) => e.id === id) ?? null;
  }, [events, id]);

  // Prefer synced data when available
  const ev = synced ?? preloaded;

  // Once synced is available, update preloaded and clear cache
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

  // ✅ MUST be declared before early returns (hooks rule)
  const typeLine = useMemo(() => {
    if (!ev) return "";

    const base = typeLabel(displayType);

    if (displayType === "course") {
      const t = String(ev.course?.courseType ?? "").trim();
      return t ? `${base} - ${t}` : base;
    }

    return base;
  }, [ev, displayType]);

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
        <View style={{ padding: 16 }}>
          <Text variant="titleMedium">Missing event id</Text>
        </View>
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

  // ✅ Fix: treat empty strings as missing (event entries often have fullTitle === "")
  const fullTitle = nonEmptyOr(ev.fullTitle ?? ev.title, "Untitled");
  const note = String(ev.note ?? "").trim();
  const color = ev.color ?? "#4dabf7";

  const dateRange = fmtDateRange(ev.start?.dateTime, ev.end?.dateTime);

  // Course fields
  const lecturer = ev.course?.lecturer ?? "-";
  const location = ev.course?.location ?? "-";
  const groups = fmtListOrDash(ev.course?.groups);

  // Party fields (Event)
  const partyEventName = nonEmptyOr(ev.party?.eventName, fullTitle);
  const partyLocation = ev.party?.location ?? "-";
  const partyCreatedBy = ev.party?.createdBy ?? "-";
  const partyEntryFee = ev.party?.entryFee ?? "-";
  const partyInvitedGroups =
    ev.party?.invitedGroups?.length ? ev.party.invitedGroups.join(", ") : "-";
  const partyFriendsAttending =
    ev.party?.friendsAttending?.length ? ev.party.friendsAttending.join(", ") : "-";

  // ✅ Title to show
  const titleToShow = displayType === "event" ? partyEventName : fullTitle;

  return (
    <Surface style={[styles.root, { backgroundColor: paper.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text variant="titleLarge" style={{ lineHeight: 32 }}>
          {titleToShow}
        </Text>

        {/* Date line directly under title */}
        <Text variant="bodySmall" style={{ color: paper.colors.onSurfaceVariant, marginTop: 6 }}>
          {dateRange}
        </Text>

        {/* Type line with color bubble */}
        <View style={[styles.typeRow, { marginTop: 10 }]}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: color, borderColor: paper.colors.outlineVariant },
            ]}
          />
          <Text variant="bodySmall" style={{ color: paper.colors.onSurfaceVariant }}>
            {typeLine}
          </Text>
        </View>

        {/* Details */}
        {displayType === "course" && (
          <>
            <Field label="Location" value={location || "-"} />
            <Field label="Lecturer" value={lecturer || "-"} />
            <Field label="Groups" value={groups} />
          </>
        )}

        {displayType === "event" && (
          <>
            <Field label="Location" value={partyLocation} />
            <Field label="Event Created By" value={partyCreatedBy} />
            <Field label="Entry fee" value={partyEntryFee} />
            <Field label="Invited Groups" value={partyInvitedGroups} />
            <Field label="Friends who are attending" value={partyFriendsAttending} />

            <View style={styles.quickActions}>
              <Button mode="outlined" onPress={() => {}}>
                Attend Event
              </Button>
              <Button mode="outlined" onPress={() => {}}>
                Invite Friend
              </Button>
            </View>
          </>
        )}

        {/* Note only if content, at very bottom */}
        {note ? <Field label="Note" value={note} /> : null}

        <View style={styles.actionsRow}>
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

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
  },

  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },

  field: {
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 2,
  },

  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
});
