export interface Member {
  id: string;
  created_at: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  created_at: string;
  title: string;
  amount: number;
  category: string;
  paid_by: string;
  is_recurring: boolean;
  date: string;
}

export interface ShoppingItem {
  id: string;
  created_at: string;
  name: string;
  category: string;
  amount: string | null;
  note: string | null;
  is_bought: boolean;
  added_by: string;
}

export interface Chore {
  id: string;
  created_at: string;
  title: string;
  assigned_to: string;
  is_completed: boolean;
  due_date: string | null;
}

export interface FridgeNote {
  id: string;
  created_at: string;
  content: string;
  author: string;
  emoji: string;
  color: string;
}

export interface NoteReaction {
  id: string;
  note_id: string;
  emoji: string;
  author: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  created_at: string;
  title: string;
  category: "יום הולדת" | "אירוע";
  event_date: string;
  recurring: boolean;
  created_by: string | null;
}

export const MONTHLY_BUDGET = 12000;
export const SHARED_FUND_LABEL = "קופה משותפת";
