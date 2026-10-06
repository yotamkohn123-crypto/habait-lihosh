export function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function currentMonthLabel() {
  const now = new Date();
  return now.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfWeekISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return start.toISOString().slice(0, 10);
}

export function nextSundayLabel() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday);
  return next.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

export function formatDueDate(day: number) {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target < now) target = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return target.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}
