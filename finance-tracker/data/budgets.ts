import { db } from "../db";
import * as Crypto from "expo-crypto";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}
const TEMPLATE_MONTH = 0; // we’ll store recurring templates as month=0 rows

export type BudgetRow = {
  id: string;
  user_id: string;
  name: string;
  month: number; // YYYYMM
  amount: number; // cap
};

export async function listRecurringBudgets() {
  return db.getAllAsync<BudgetRow>(
    `SELECT * FROM budgets WHERE user_id='me' AND month = ? ORDER BY name COLLATE NOCASE ASC`,
    [TEMPLATE_MONTH]
  );
}

export async function createRecurringBudget(name: string, amount: number) {
  const id = await Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO budgets (id, user_id, name, month, amount)
     VALUES (?, 'me', ?, ?, ?)`,
    [id, name, TEMPLATE_MONTH, amount]
  );
  return id;
}

export async function updateRecurringBudget(
  id: string,
  fields: { name?: string; amount?: number }
) {
  const sets: string[] = [];
  const params: any[] = [];
  if (fields.name !== undefined) {
    sets.push("name = ?");
    params.push(fields.name);
  }
  if (fields.amount !== undefined) {
    sets.push("amount = ?");
    params.push(fields.amount);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(
    `UPDATE budgets SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}

export async function deleteRecurringBudget(id: string) {
  await db.runAsync(`DELETE FROM budgets WHERE id = ? AND month = ?`, [
    id,
    TEMPLATE_MONTH,
  ]);
  // NOTE: We intentionally do NOT delete past monthly instances so history remains intact.
}

/** Ensure every recurring budget has a concrete row for a given month. */
const _ensureFlight = new Map<number, Promise<void>>();

export async function ensureRecurringBudgets(yyyymm: number) {
  // de-duplicate concurrent calls per-month to avoid nested/overlapping work
  if (_ensureFlight.has(yyyymm)) return _ensureFlight.get(yyyymm)!;

  const p = (async () => {
    const templates = await listRecurringBudgets();
    if (!templates.length) return;
    for (const t of templates) {
      await db.runAsync(
        `INSERT OR IGNORE INTO budgets (id, user_id, name, month, amount)
         VALUES (?, 'me', ?, ?, ?)`,
        [await Crypto.randomUUID(), t.name, yyyymm, t.amount]
      );
    }
  })();

  _ensureFlight.set(yyyymm, p);
  try {
    await p;
  } finally {
    _ensureFlight.delete(yyyymm);
  }
}

export async function listBudgetsByMonth(yyyymm: number) {
  return db.getAllAsync<BudgetRow>(
    `SELECT * FROM budgets WHERE user_id='me' AND month = ? ORDER BY name COLLATE NOCASE ASC`,
    [yyyymm]
  );
}

export async function createBudget(
  name: string,
  amount: number,
  month?: number
) {
  const id = await Crypto.randomUUID();
  const m = month ?? getYYYYMM();
  await db.runAsync(
    `INSERT INTO budgets (id, user_id, name, month, amount)
     VALUES (?, 'me', ?, ?, ?)`,
    [id, name, m, amount]
  );
  return id;
}

export async function updateBudget(
  id: string,
  fields: { name?: string; amount?: number }
) {
  const sets: string[] = [];
  const params: any[] = [];
  if (fields.name !== undefined) {
    sets.push("name = ?");
    params.push(fields.name);
  }
  if (fields.amount !== undefined) {
    sets.push("amount = ?");
    params.push(fields.amount);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(
    `UPDATE budgets SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}

export async function deleteBudget(id: string) {
  // We'll NULL out references so the spends remain
  await db.runAsync("BEGIN");
  try {
    await db.runAsync(
      `UPDATE personal_spend SET budget_id = NULL WHERE budget_id = ?`,
      [id]
    );
    await db.runAsync(`DELETE FROM budgets WHERE id = ?`, [id]);
    await db.runAsync("COMMIT");
  } catch (e) {
    await db.runAsync("ROLLBACK");
    throw e;
  }
}

/** Sum of personal_spend amounts per budget for this month */
export async function budgetUsages(yyyymm: number) {
  return db.getAllAsync<{ budget_id: string | null; total: number }>(
    `SELECT budget_id, COALESCE(SUM(amount),0) AS total
     FROM personal_spend
     WHERE user_id='me'
       AND CAST(strftime('%Y%m', date/1000, 'unixepoch') AS INTEGER) = ?
     GROUP BY budget_id`,
    [yyyymm]
  );
}

export async function getBudgetById(id: string) {
  return db.getFirstAsync<BudgetRow>(`SELECT * FROM budgets WHERE id = ?`, [
    id,
  ]);
}

export { TEMPLATE_MONTH };
