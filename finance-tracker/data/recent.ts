import { db } from "../db";

export type RecentItem =
  | { type: "expense"; id: string; title: string; amount: number; date: number }
  | { type: "spend"; id: string; title: string; amount: number; date: number };

export async function listRecentTransactions(
  limit = 30
): Promise<RecentItem[]> {
  const expenses = await db.getAllAsync<{
    id: string;
    description: string | null;
    amount: number;
    date: number;
  }>(
    `SELECT id, description, amount, date
     FROM expenses
     ORDER BY date DESC
     LIMIT ?`,
    [limit]
  );

  const spends = await db.getAllAsync<{
    id: string;
    note: string | null;
    category: string;
    amount: number;
    date: number;
  }>(
    `SELECT id, note, category, amount, date
     FROM personal_spend
     ORDER BY date DESC
     LIMIT ?`,
    [limit]
  );

  const mappedE = expenses.map((e) => ({
    type: "expense" as const,
    id: e.id,
    title: e.description ?? "Shared expense",
    amount: e.amount,
    date: e.date,
  }));

  const mappedS = spends.map((s) => ({
    type: "spend" as const,
    id: s.id,
    title: s.note ?? s.category,
    amount: s.amount,
    date: s.date,
  }));

  // Merge & sort desc by date
  return [...mappedE, ...mappedS]
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}
