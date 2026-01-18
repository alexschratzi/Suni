export const toDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === "function") return value.toDate();
  return null;
};

export const formatTime = (
  value: any,
  locale: string,
  t: (key: string, fallback?: string) => string
) => {
  const dateValue = toDate(value);
  if (!dateValue) return t("chat.justNow");
  return dateValue.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTimestamp = (
  value: any,
  locale: string,
  t: (key: string, fallback?: string) => string
) => {
  const dateValue = toDate(value);
  if (!dateValue) return t("chat.justNow");
  return dateValue.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const isSameDay = (a: any, b: any) => {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA || !dateB) return false;
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

export const formatDateLabel = (
  value: any,
  locale: string,
  t: (key: string, fallback?: string) => string
) => {
  const dateValue = toDate(value);
  if (!dateValue) return "";
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfDate = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate()
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  );
  if (diffDays === 0) return t("chat.date.today", "Heute");
  if (diffDays === 1) return t("chat.date.yesterday", "Gestern");
  return dateValue.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
