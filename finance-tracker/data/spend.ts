import { db } from "../db";
import type { PersonalSpendRow } from "../types/db";
import * as Crypto from "expo-crypto";

export async function addPersonalSpend(
  amount: number,
  category: string,
  note?: string,
  date?: number
) {
  const id = await Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO personal_spend (id, user_id, amount, category, date, note)
     VALUES (?, 'me', ?, ?, ?, ?)`,
    [id, amount, category, date ?? Date.now(), note ?? null]
  );
  return id;
}

export async function listPersonalSpendByMonth(
  yyyymm: number,
  category?: string
) {
  const start = new Date(
    String(yyyymm).slice(0, 4) + "-" + String(yyyymm).slice(4) + "-01"
  ).getTime();
  const endMonth = new Date(
    String(yyyymm).slice(0, 4) + "-" + String(yyyymm).slice(4) + "-01"
  );
  endMonth.setMonth(endMonth.getMonth() + 1);
  const end = endMonth.getTime();

  if (category && category !== "All") {
    return db.getAllAsync<PersonalSpendRow>(
      `SELECT * FROM personal_spend WHERE user_id='me' AND date >= ? AND date < ? AND category = ?
       ORDER BY date DESC`,
      [start, end, category]
    );
  }
  return db.getAllAsync<PersonalSpendRow>(
    `SELECT * FROM personal_spend WHERE user_id='me' AND date >= ? AND date < ?
     ORDER BY date DESC`,
    [start, end]
  );
}

export async function getPersonalSpendById(id: string) {
  return db.getFirstAsync<PersonalSpendRow>(
    `SELECT * FROM personal_spend WHERE id = ?`,
    [id]
  );
}

export async function updatePersonalSpendBasic(
  id: string,
  fields: { amount?: number; category?: string; note?: string }
) {
  const sets: string[] = [];
  const params: any[] = [];
  if (fields.amount !== undefined) {
    sets.push("amount = ?");
    params.push(fields.amount);
  }
  if (fields.category !== undefined) {
    sets.push("category = ?");
    params.push(fields.category ?? null);
  }
  if (fields.note !== undefined) {
    sets.push("note = ?");
    params.push(fields.note ?? null);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(
    `UPDATE personal_spend SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}

export async function deletePersonalSpend(id: string) {
  await db.runAsync(`DELETE FROM personal_spend WHERE id = ?`, [id]);
}
