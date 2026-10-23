export function toDateOnly(input: string | Date): Date {
  if (typeof input === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (!match) throw new Error("日期格式应为 YYYY-MM-DD");
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function formatDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localISODate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shanghaiParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function shanghaiToday() {
  return shanghaiParts().date;
}

export function shanghaiStartOfToday() {
  const today = shanghaiToday();
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
}

export function displayDate(iso: string | null, locale: string) {
  if (!iso) return locale === "en" ? "Not yet" : "还没有";
  if (iso === localISODate() || iso === shanghaiToday()) {
    return locale === "en" ? "Today" : "今天";
  }
  const [year, month, day] = iso.split("-");
  if (locale === "en") return `${Number(month)}/${Number(day)}/${year}`;
  return `${year}/${Number(month)}/${Number(day)}`;
}

export function monthLabel(isoMonth: string, locale: string) {
  const [year, month] = isoMonth.split("-");
  if (locale === "en") return `${year}-${month}`;
  return `${year}年${Number(month)}月`;
}

export function shiftMonth(isoMonth: string, delta: number) {
  const [year, month] = isoMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${nextMonth}`;
}
