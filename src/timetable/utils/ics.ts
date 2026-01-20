// src/timetable/utils/ics.ts
import type { ICalSubscription, RawIcalEvent } from "@/types/timetable";

function parseIcsDate(raw: string): string | null {
  let m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (m) {
    const [, y, mo, d, hh, mm, ss, z] = m;
    const year = Number(y);
    const month = Number(mo) - 1;
    const day = Number(d);
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);

    const date = z
      ? new Date(Date.UTC(year, month, day, hour, minute, second))
      : new Date(year, month, day, hour, minute, second);
    return date.toISOString();
  }

  m = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    const year = Number(y);
    const month = Number(mo) - 1;
    const day = Number(d);
    const date = new Date(year, month, day, 0, 0, 0);
    return date.toISOString();
  }

  const fallback = new Date(raw);
  if (!isNaN(fallback.getTime())) return fallback.toISOString();
  return null;
}

function splitIcsLine(line: string): { left: string; right: string } | null {
  // ✅ split at FIRST ":" only (values may contain ":" e.g. "EC: Big Data")
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  return { left: line.slice(0, idx), right: line.slice(idx + 1) };
}

function parseICS(ics: string): RawIcalEvent[] {
  // Unfold lines: CRLF + space/tab indicates continuation (RFC 5545)
  const unfolded = ics.replace(/\r\n[ \t]/g, "");

  const parts = unfolded.split("BEGIN:VEVENT");
  parts.shift();

  const out: RawIcalEvent[] = [];

  for (const part of parts) {
    const endIdx = part.indexOf("END:VEVENT");
    const body = endIdx === -1 ? part : part.slice(0, endIdx);

    const lines = body.split(/\r?\n/);

    let uid: string | undefined;
    let summary: string | undefined;
    let description: string | undefined;
    let location: string | undefined;
    let dtstartRaw: string | undefined;
    let dtendRaw: string | undefined;

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = splitIcsLine(line);
      if (!parsed) continue;

      const propName = parsed.left.split(";")[0].toUpperCase();
      const value = parsed.right.trim();

      switch (propName) {
        case "UID":
          uid = value;
          break;
        case "SUMMARY":
          summary = value;
          break;
        case "DESCRIPTION":
          description = value;
          break;
        case "LOCATION":
          location = value; // ✅ NEW
          break;
        case "DTSTART":
          dtstartRaw = value;
          break;
        case "DTEND":
          dtendRaw = value;
          break;
        default:
          break;
      }
    }

    if (!uid || !dtstartRaw || !dtendRaw) continue;

    const startIso = parseIcsDate(dtstartRaw);
    const endIso = parseIcsDate(dtendRaw);
    if (!startIso || !endIso) continue;

    out.push({
      uid,
      summary: summary ?? "",
      description: description ?? "",
      location: location ?? "",
      start: startIso,
      end: endIso,
    });
  }

  return out;
}

export async function fetchIcalEventsForSubscription(
  sub: ICalSubscription,
): Promise<RawIcalEvent[]> {
  try {
    const res = await fetch(sub.url);
    if (!res.ok) {
      console.warn("Failed to fetch iCal:", sub.url, res.status);
      return [];
    }
    const text = await res.text();
    return parseICS(text);
  } catch (e) {
    console.warn("Error fetching iCal:", sub.url, e);
    return [];
  }
}
