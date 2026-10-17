export type Category = {
  id: string;
  name: string;
  icon: string;
  kind: "daily" | "fixed";
  lump_sum: boolean;
  due_day: number | null;
  sort_order: number;
};

export type Member = { id: string; user_id: string; display_name: string; household_id: string };

export type Expense = {
  id: string;
  category_id: string;
  member_id: string;
  amount: number;
  spent_on: string;
  note: string | null;
};

export type Item = {
  id: string;
  name: string;
  unit: string;
  monthly_need: number;
  stock: number;
  last_price: number;
  active: boolean;
};

export type ListItem = {
  id: string;
  list_id: string;
  item_id: string | null;
  name: string;
  unit: string;
  qty_recommended: number;
  qty_bought: number;
  unit_price_est: number;
  unit_price_actual: number;
  checked: boolean;
  is_extra: boolean;
};

export type ShoppingList = {
  id: string;
  month: string;
  status: "open" | "done";
  completed_by: string | null;
  completed_at: string | null;
};

export type XpEvent = {
  id: string;
  member_id: string | null;
  kind: "log" | "streak" | "bill" | "saving" | "bonus" | "quest" | "budget";
  points: number;
  note: string | null;
  created_at: string;
};
