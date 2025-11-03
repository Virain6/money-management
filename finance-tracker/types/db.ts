export type UserRow = {
  id: string;
  display_name: string;
  email: string | null;
};

export type ExpenseRow = {
  id: string;
  description: string | null;
  category: string | null;
  amount: number;
  currency: string | null;
  date: number; // epoch ms
  created_by: string | null;
  payer_id: string | null;
};

export type ExpenseParticipantRow = {
  expense_id: string;
  user_id: string;
  share: number; // amount owed by this user for the expense
};

export type SettlementRow = {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  date: number;
  note: string | null;
};

export type PersonalSpendRow = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  date: number;
  note: string | null;
};
