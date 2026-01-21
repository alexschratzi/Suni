// src/timetable/utils/fhSalzburg.ts

const STOPWORDS = new Set([
  "for",
  "and",
  "of",
  "the",
  "a",
  "an",
  "to",
  "in",
  "für",
  "und",
  "oder",
  "der",
  "die",
  "das",
  "im",
  "am",
  "von",
  "mit",
]);

/**
 * Multi-word course types treated as ONE type token.
 * Match is case-insensitive and must occur at the END of line 1 (after code removal).
 */
const MULTI_WORD_TYPES = ["asynchronous teaching", "asynchrone lehre"] as const;

function splitLines(desc: string): string[] {
  return String(desc ?? "")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Unescape RFC5545 TEXT escapes
 */
function unescapeIcalText(s: string): string {
  return String(s ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Normalize FH-Salzburg separators in GROUPS:
 * - "\,"  → ","
 * - "\/"  → ","
 * - "/,"  → ","
 */
function normalizeGroupSeparators(input: string): string {
  return String(input ?? "")
    .replace(/\\,/g, ",")
    .replace(/\\\//g, ",")
    .replace(/\/,/g, ",");
}

export function makeInitialsAbbr(title: string, maxLen = 4): string {
  const words = String(title ?? "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const initials = words
    .filter((w) => !STOPWORDS.has(w.toLowerCase()))
    .map((w) => w[0]!)
    .join("")
    .toUpperCase();

  return initials.slice(0, maxLen);
}

function stripLeadingCodePrefix(line1: string): string {
  // Remove everything up to and including the FIRST " - "
  return line1.includes(" - ")
    ? line1.slice(line1.indexOf(" - ") + 3).trim()
    : line1.trim();
}

function extractTypeAndTitle(afterDash: string): { title: string; courseType: string } {
  const s = String(afterDash ?? "").trim();
  if (!s) return { title: "", courseType: "" };

  const lower = s.toLowerCase();

  // 1) Multi-word types (must match end of string)
  for (const phrase of MULTI_WORD_TYPES) {
    const p = phrase.toLowerCase();
    if (lower.endsWith(p)) {
      const typeStart = s.length - p.length;
      const courseType = s.slice(typeStart).trim();
      const title = s.slice(0, typeStart).trim();
      return { title, courseType };
    }
  }

  // 2) Default: last token is type
  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { title: s, courseType: "" };

  const courseType = tokens[tokens.length - 1];
  const title = tokens.slice(0, -1).join(" ").trim();
  return { title, courseType };
}

/**
 * FH-Salzburg DESCRIPTION format:
 * 1) "<MODULECODE> - <TITLE> <TYPE>"   (TYPE can be multi-word)
 * 2) groups line
 * ...
 * LAST LINE: lecturer  ✅ (always)
 *
 * NOTE: Location is NOT read from DESCRIPTION anymore (now comes from ICS LOCATION:)
 */
export function parseFhSalzburgDescription(desc: string): {
  title?: string;
  titleAbbr?: string;
  courseType?: string;
  groups?: string[];
  lecturer?: string;
} {
  const rawLines = splitLines(desc);
  if (rawLines.length === 0) return {};

  const lines = rawLines.map(unescapeIcalText);

  // Lecturer = last non-empty line
  const lecturer = lines.length ? lines[lines.length - 1].trim() : "";

  // Line 1: remove only "<CODE> - "
  const line1 = lines[0] ?? "";
  const afterDash = stripLeadingCodePrefix(line1);
  const { title, courseType } = extractTypeAndTitle(afterDash);

  // Groups: still primarily from line 2 if present
  const rawGroupsLine = rawLines[1] ?? "";
  const normalizedGroupsLine = normalizeGroupSeparators(rawGroupsLine);
  const groupsLine = unescapeIcalText(normalizedGroupsLine);

  const groups = groupsLine
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const titleAbbr = makeInitialsAbbr(title, 4) || "";

  return {
    title,
    titleAbbr,
    courseType,
    groups,
    lecturer,
  };
}
