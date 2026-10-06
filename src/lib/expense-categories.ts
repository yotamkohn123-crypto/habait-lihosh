export const EXPENSE_CATEGORIES = ["סופר", "ספורט", "בילויים", "בית", "כללי"];

export const EXPENSE_ICONS: Record<string, string> = {
  סופר: "🥑",
  ספורט: "⚽",
  בילויים: "🎉",
  בית: "🏠",
  כללי: "💳",
};

export const EXPENSE_BAR_COLORS: Record<string, string> = {
  סופר: "bg-emerald-500",
  ספורט: "bg-indigo-400",
  בילויים: "bg-rose-400",
  בית: "bg-amber-500",
  כללי: "bg-stone-400",
};

export const EXPENSE_HEX_COLORS: Record<string, string> = {
  סופר: "#10b981",
  ספורט: "#818cf8",
  בילויים: "#fb7185",
  בית: "#f59e0b",
  כללי: "#a8a29e",
};

export const FIXED_BILLS = [
  { name: "שכר דירה", icon: "🏠", dueDay: 1 },
  { name: "חשמל", icon: "⚡", dueDay: 10 },
  { name: "מים", icon: "💧", dueDay: 10 },
  { name: "גז", icon: "🔥", dueDay: 10 },
  { name: "ארנונה", icon: "🏛️", dueDay: 15 },
];
