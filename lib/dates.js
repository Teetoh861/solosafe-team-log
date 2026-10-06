const TZ = "Africa/Lagos";

// "YYYY-MM-DD" in Lagos time.
export function lagosDay(input) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(input));
}

// 0 = Monday ... 6 = Sunday, in Lagos time.
export function lagosWeekdayIndex(input) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(input));
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
}

export function addDays(dayKey, n) {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Monday of the week containing `input`, offset by `weekOffset` weeks.
export function weekStart(input, weekOffset = 0) {
  const day = lagosDay(input);
  return addDays(day, -lagosWeekdayIndex(input) + weekOffset * 7);
}

export function prettyDay(dayKey) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
