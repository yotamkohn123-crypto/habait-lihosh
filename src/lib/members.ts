import { Member } from "@/lib/types";

export const MEMBER_COLOR_PALETTE = [
  "#1f6f5c",
  "#d97706",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#059669",
  "#dc2626",
  "#0891b2",
];

export function memberColor(members: Member[], name: string): string {
  return members.find((m) => m.name === name)?.color ?? "#78716c";
}

export function memberInitial(name: string): string {
  return name.trim().charAt(0) || "?";
}
