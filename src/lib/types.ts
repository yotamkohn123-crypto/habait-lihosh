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

export type Recurrence = "יומי" | "שבועי" | "חודשי";

export interface Chore {
  id: string;
  created_at: string;
  title: string;
  assigned_to: string;
  is_completed: boolean;
  due_date: string | null;
  recurrence: Recurrence | null;
  recurrence_day: number | null;
  estimated_minutes: number | null;
}

export interface ChoreStep {
  id: string;
  created_at: string;
  chore_id: string;
  text: string;
  estimated_minutes: number | null;
  is_completed: boolean;
  order_index: number;
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

export interface AppSettings {
  id: number;
  monthly_income: number;
  weekly_budget: number;
  show_money_analogies: boolean;
  helper_name: string | null;
  meal_reminder_time: string | null;
}
