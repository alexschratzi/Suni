// src/timetable/utils/date.ts
import dayjs from "dayjs";
import "dayjs/locale/de";

dayjs.locale("de");

export function getMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export const addWeeks = (base: Date, w: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + w * 7);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const fmtYMD = (d: Date) => dayjs(d).format("YYYY-MM-DD");

export function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  if (typeof v === "object" && v !== null) {
    const obj = v as { dateTime?: string; date?: string };
    if (obj.dateTime) return new Date(obj.dateTime);
    if (obj.date) return new Date(`${obj.date}T00:00:00`);
  }
  return new Date();
}

export const toISO = (v: unknown) => toDate(v).toISOString();

export function makeTitleAbbr(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words.map((w) => w.charAt(0)).join("");
}

export function formatDateTimeIso(iso: string): string {
  if (!iso) return "";
  return dayjs(iso).format("DD.MM.YYYY HH:mm");
}

export const makeIcalMetaKey = (subscriptionId: string, uid: string) => `${subscriptionId}::${uid}`;
