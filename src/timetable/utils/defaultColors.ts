// src/timetable/utils/defaultColors.ts
import type { EntryDisplayType, EventEditorForm } from "@/types/timetable";

export const DEFAULT_COLORS = {
  course: "#4dabf7", // Blue
  assessment: "#ffd43b", // Yellow
  none: "#845ef7", // Purple
  event: "#69db7c", // Green
  assignment: "#ffa94d", // Orange (not implemented yet)
} as const;

const ASSESSMENT_KEYWORDS = [
  // EN
  "quiz",
  "test",
  "exam",
  "midterm",
  "final",
  // DE
  "klausur",
  "prüfung",
  "pruefung",
  "testat",
  // common variants / typos
  "quizz",
] as const;

function normalizeText(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAssessmentLike(text: string): boolean {
  const t = normalizeText(text);
  if (!t) return false;
  return ASSESSMENT_KEYWORDS.some((kw) => t.includes(kw));
}

/**
 * Default color for an editor form + display type.
 * Yellow overrides for assessment keywords in:
 * - title (all types)
 * - courseType (when type === "course")
 */
export function getDefaultColorForEditorForm(
  form: EventEditorForm | null | undefined,
  displayType: EntryDisplayType,
): string {
  if (displayType === "event") return DEFAULT_COLORS.event;

  // Future type (not currently used in UI)
  if ((displayType as any) === "assignment") return DEFAULT_COLORS.assignment;

  const title = String((form as any)?.fullTitle ?? "");
  const courseType = displayType === "course" ? String((form as any)?.courseType ?? "") : "";

  const isAssessment = isAssessmentLike(title) || (displayType === "course" && isAssessmentLike(courseType)); //FIXME does not work and maybe causes lags

  if (isAssessment) return DEFAULT_COLORS.assessment;

  if (displayType === "course") return DEFAULT_COLORS.course;

  // "none"
  return DEFAULT_COLORS.none;
}

/**
 * Reorder palette so default is first, without duplicates.
 */
export function withDefaultFirst(options: string[], defaultColor: string): string[] {
  const uniq = Array.from(new Set(options.map((c) => String(c).trim()).filter(Boolean)));
  const rest = uniq.filter((c) => c.toLowerCase() !== defaultColor.toLowerCase());
  return [defaultColor, ...rest];
}
