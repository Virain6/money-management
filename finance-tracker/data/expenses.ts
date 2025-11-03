import { db } from "../db";
import type { ExpenseRow } from "../types/db";
import * as Crypto from "expo-crypto";
export type SplitMode = "equal" | "percent" | "shares" | "amounts";

type CreateExpenseInput = {
  description?: string;
  total: number;
  date?: number;
  payerId: string; // who paid
  participantIds: string[]; // who participates
  category?: string;
  mode: SplitMode;
  // values per participant in the same order as participantIds
  percents?: number[]; // must sum to 100
  shares?: number[]; // relative shares (sum > 0)
  amounts?: number[]; // must sum == total
};

export async function addExpenseWithSplits(input: CreateExpenseInput) {
  const id = await Crypto.randomUUID();
  const date = input.date ?? Date.now();
  const n = input.participantIds.length;
  if (n <= 0) throw new Error("Need at least one participant");
  if (input.total <= 0) throw new Error("Total must be > 0");

  // compute per-person amounts in dollars matching participants order
  const amounts = computeSplitArray({
    total: input.total,
    participantIds: input.participantIds,
    mode: input.mode,
    percents: input.percents,
    shares: input.shares,
    amounts: input.amounts,
  });

  // Insert expense
  await db.runAsync(
    `INSERT INTO expenses (id, description, category, amount, currency, date, created_by, payer_id)
     VALUES (?, ?, ?, ?, 'CAD', ?, 'me', ?)`,
    [
      id,
      input.description ?? null,
      input.category ?? null,
      input.total,
      date,
      input.payerId,
    ]
  );

  // Insert participants
  const stmt = await db.prepareAsync(
    "INSERT INTO expense_participants (expense_id, user_id, share) VALUES (?, ?, ?)"
  );
  try {
    for (let i = 0; i < n; i++) {
      await stmt.executeAsync([id, input.participantIds[i], amounts[i]]);
    }
  } finally {
    await stmt.finalizeAsync();
  }

  return id;
}

type EqualSplitInput = {
  description?: string;
  total: number;
  date?: number; // epoch ms
  payerId: string; // 'me' or another user id
  participantIds: string[]; // must include payer if they participate
  category?: string;
};

export async function addExpenseEqualSplit(input: EqualSplitInput) {
  const id = await Crypto.randomUUID();
  const date = input.date ?? Date.now();
  const n = input.participantIds.length;
  if (n <= 0) throw new Error("Need at least one participant");

  // Equal split with cent rounding (last person receives remainder)
  const cents = Math.round(input.total * 100);
  const even = Math.floor(cents / n);
  const remainder = cents - even * n;
  const sharesCents = input.participantIds.map((_, idx) =>
    idx === n - 1 ? even + remainder : even
  );

  // Insert expense
  await db.runAsync(
    `INSERT INTO expenses (id, description, category, amount, currency, date, created_by, payer_id)
     VALUES (?, ?, ?, ?, 'CAD', ?, 'me', ?)`,
    [
      id,
      input.description ?? null,
      input.category ?? null,
      input.total,
      date,
      input.payerId,
    ]
  );

  // Insert participants
  const stmt = await db.prepareAsync(
    "INSERT INTO expense_participants (expense_id, user_id, share) VALUES (?, ?, ?)"
  );
  try {
    for (let i = 0; i < input.participantIds.length; i++) {
      await stmt.executeAsync([
        id,
        input.participantIds[i],
        sharesCents[i] / 100,
      ]);
    }
  } finally {
    await stmt.finalizeAsync();
  }

  return id;
}

// Simple recent list for a person detail (owed lines)
export async function listRecentExpensesForPerson(personId: string) {
  // shows expenses where person participated or paid
  const rows = await db.getAllAsync<
    ExpenseRow & { my_share?: number; person_name: string }
  >(
    `
    SELECT
      e.*,
      ep.share AS my_share,
      (SELECT display_name FROM users WHERE id = ?) AS person_name
    FROM expenses e
    LEFT JOIN expense_participants ep
      ON ep.expense_id = e.id AND ep.user_id = ?
    WHERE EXISTS (
      SELECT 1 FROM expense_participants p WHERE p.expense_id = e.id AND p.user_id = ?
    )
    OR e.payer_id = ?
    ORDER BY date DESC
    LIMIT 20
  `,
    [personId, personId, personId, personId]
  );
  return rows;
}

// Net balance vs each person (positive => they owe you)
export async function listNetByPerson() {
  // debt owed to 'me'
  const owedToMe = await db.getAllAsync<{ user_id: string; amount: number }>(`
    SELECT ep.user_id, SUM(ep.share) AS amount
    FROM expenses e
    JOIN expense_participants ep ON ep.expense_id = e.id
    WHERE e.payer_id = 'me' AND ep.user_id != 'me'
    GROUP BY ep.user_id
  `);

  // my debt to others
  const iOwe = await db.getAllAsync<{ payer_id: string; amount: number }>(`
    SELECT e.payer_id, SUM(ep.share) AS amount
    FROM expenses e
    JOIN expense_participants ep ON ep.expense_id = e.id
    WHERE ep.user_id = 'me' AND e.payer_id != 'me'
    GROUP BY e.payer_id
  `);

  // settlements: who paid whom
  const settlementsToMe = await db.getAllAsync<{
    payee_id: string;
    amount: number;
  }>(`
    SELECT payer_id AS payee_id, SUM(amount) AS amount
    FROM settlements
    WHERE payee_id = 'me'
    GROUP BY payer_id
  `);
  const settlementsISent = await db.getAllAsync<{
    payee_id: string;
    amount: number;
  }>(`
    SELECT payee_id, SUM(amount) AS amount
    FROM settlements
    WHERE payer_id = 'me'
    GROUP BY payee_id
  `);

  // fold into a map
  const map = new Map<string, number>();
  for (const r of owedToMe)
    map.set(r.user_id, (map.get(r.user_id) ?? 0) + (r.amount ?? 0));
  for (const r of iOwe)
    map.set(r.payer_id, (map.get(r.payer_id) ?? 0) - (r.amount ?? 0));
  for (const r of settlementsToMe)
    map.set(r.payee_id, (map.get(r.payee_id) ?? 0) + (r.amount ?? 0));
  for (const r of settlementsISent)
    map.set(r.payee_id, (map.get(r.payee_id) ?? 0) - (r.amount ?? 0));

  return map; // personId -> net
}

// Get single expense (with participants & names)
export async function getExpenseById(id: string) {
  const expense = await db.getFirstAsync<ExpenseRow>(
    `SELECT * FROM expenses WHERE id = ?`,
    [id]
  );
  const participants = await db.getAllAsync<{
    user_id: string;
    share: number;
    name: string;
  }>(
    `SELECT ep.user_id, ep.share, u.display_name AS name
     FROM expense_participants ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.expense_id = ?`,
    [id]
  );
  return { expense, participants };
}

// Simple update: description & amount (you can extend later)
export async function updateExpenseBasic(
  id: string,
  fields: { description?: string; amount?: number; category?: string }
) {
  const sets: string[] = [];
  const params: any[] = [];
  if (fields.description !== undefined) {
    sets.push("description = ?");
    params.push(fields.description ?? null);
  }
  if (fields.amount !== undefined) {
    sets.push("amount = ?");
    params.push(fields.amount);
  }
  if (fields.category !== undefined) {
    sets.push("category = ?");
    params.push(fields.category ?? null);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(
    `UPDATE expenses SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}

// Delete expense and its participants
export async function deleteExpense(id: string) {
  await db.runAsync(`DELETE FROM expense_participants WHERE expense_id = ?`, [
    id,
  ]);
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
}

type UpdateExpenseInput = {
  id: string;
  description?: string;
  total: number;
  date?: number;
  payerId: string;
  participantIds: string[]; // order matters relative to the arrays below
  category?: string;
  mode: SplitMode;
  percents?: number[]; // sum = 100
  shares?: number[]; // any positives
  amounts?: number[]; // sum = total
};

// For editing UI: fetch the expense + participants with names
export async function getExpenseWithParticipants(id: string) {
  const expense = await db.getFirstAsync<ExpenseRow>(
    `SELECT * FROM expenses WHERE id = ?`,
    [id]
  );
  const participants = await db.getAllAsync<{
    user_id: string;
    share: number;
    name: string;
  }>(
    `SELECT ep.user_id, ep.share, u.display_name AS name
     FROM expense_participants ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.expense_id = ?
     ORDER BY u.display_name COLLATE NOCASE ASC`,
    [id]
  );
  return { expense, participants };
}

export async function updateExpenseWithSplits(input: UpdateExpenseInput) {
  const { id, total, participantIds, mode, percents, shares, amounts } = input;
  const n = participantIds.length;
  if (n <= 0) throw new Error("Need at least one participant");
  if (total <= 0) throw new Error("Total must be > 0");

  // compute per-person amounts in dollars
  const perPerson = computeSplitArray({
    total,
    participantIds,
    mode,
    percents,
    shares,
    amounts,
  });

  // update parent row
  await db.runAsync(
    `UPDATE expenses
       SET description = ?, category = ?, amount = ?, date = ?, payer_id = ?
     WHERE id = ?`,
    [
      input.description ?? null,
      input.category ?? null,
      total,
      input.date ?? Date.now(),
      input.payerId,
      id,
    ]
  );

  // replace participants
  await db.runAsync(`DELETE FROM expense_participants WHERE expense_id = ?`, [
    id,
  ]);

  const stmt = await db.prepareAsync(
    "INSERT INTO expense_participants (expense_id, user_id, share) VALUES (?, ?, ?)"
  );
  try {
    for (let i = 0; i < n; i++) {
      await stmt.executeAsync([id, participantIds[i], perPerson[i]]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

// Reuse the same splitting logic as the create flow
function computeSplitArray(params: {
  total: number;
  participantIds: string[];
  mode: SplitMode;
  percents?: number[];
  shares?: number[];
  amounts?: number[];
}): number[] {
  const { total, participantIds, mode } = params;
  const n = participantIds.length;
  const cents = Math.round(total * 100);

  if (mode === "equal") {
    const even = Math.floor(cents / n);
    const remainder = cents - even * n;
    const arr = new Array(n).fill(even);
    arr[n - 1] += remainder;
    return arr.map((c) => c / 100);
  }

  if (mode === "percent") {
    if (!params.percents || params.percents.length !== n) {
      throw new Error("Provide percents for each participant.");
    }
    const sum = Math.round(params.percents.reduce((s, p) => s + p, 0));
    if (sum !== 100) throw new Error("Percents must sum to 100.");
    const raw = params.percents.map((p) => Math.floor((p / 100) * cents));
    let remain = cents - raw.reduce((s, v) => s + v, 0);
    for (let i = 0; i < n && remain > 0; i++) {
      raw[i] += 1;
      remain--;
    }
    return raw.map((c) => c / 100);
  }

  if (mode === "shares") {
    if (!params.shares || params.shares.length !== n) {
      throw new Error("Provide shares for each participant.");
    }
    const sumShares = params.shares.reduce((s, x) => s + (x > 0 ? x : 0), 0);
    if (sumShares <= 0) throw new Error("Shares must sum to > 0.");
    const raw = params.shares.map((s) => Math.floor((s / sumShares) * cents));
    let remain = cents - raw.reduce((s, v) => s + v, 0);
    for (let i = 0; i < n && remain > 0; i++) {
      raw[i] += 1;
      remain--;
    }
    return raw.map((c) => c / 100);
  }

  // amounts
  if (!params.amounts || params.amounts.length !== n) {
    throw new Error("Provide explicit amounts for each participant.");
  }
  const sum = Math.round(params.amounts.reduce((s, a) => s + a, 0) * 100);
  if (sum !== cents) throw new Error("Explicit amounts must equal total.");
  return params.amounts;
}
