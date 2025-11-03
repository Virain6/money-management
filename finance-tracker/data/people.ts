import { db } from "../db";
import type { UserRow } from "../types/db";
import * as Crypto from "expo-crypto";

export async function addPerson(name: string, email?: string) {
  const id = await Crypto.randomUUID();
  await db.runAsync(
    "INSERT INTO users (id, display_name, email) VALUES (?, ?, ?)",
    [id, name.trim(), email?.trim() ?? null]
  );
  return id;
}

export async function listPeople(): Promise<UserRow[]> {
  const rows = await db.getAllAsync<UserRow>(`
    SELECT id, display_name, email
    FROM users
    WHERE id != 'me'
    ORDER BY display_name COLLATE NOCASE ASC
  `);
  return rows;
}

export async function getAllPeopleIncludingMe(): Promise<UserRow[]> {
  const rows = await db.getAllAsync<UserRow>(`
    SELECT id, display_name, email
    FROM users
    ORDER BY CASE WHEN id='me' THEN 0 ELSE 1 END, display_name COLLATE NOCASE ASC
  `);
  return rows;
}

export async function deletePerson(id: string) {
  await db.runAsync("BEGIN TRANSACTION");
  try {
    await db.runAsync("DELETE FROM expense_participants WHERE user_id = ?", [
      id,
    ]);
    await db.runAsync(
      "DELETE FROM settlements WHERE payer_id = ? OR payee_id = ?",
      [id, id]
    );
    await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
    await db.runAsync("COMMIT");
  } catch (e) {
    await db.runAsync("ROLLBACK");
    throw e;
  }
}
