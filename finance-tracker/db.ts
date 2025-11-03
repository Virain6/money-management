// db.ts
import { openDatabaseSync } from "expo-sqlite";

export const db = openDatabaseSync("finance.db");

export async function ensureSchema() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      created_by TEXT,
      description TEXT,
      category TEXT,
      amount REAL,
      currency TEXT DEFAULT 'CAD',
      date INTEGER
    );
    CREATE TABLE IF NOT EXISTS expense_participants (
      expense_id TEXT,
      user_id TEXT,
      share REAL,
      PRIMARY KEY (expense_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      payer_id TEXT,
      payee_id TEXT,
      amount REAL,
      date INTEGER,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS category_budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      category TEXT,
      month INTEGER,
      amount REAL
    );
  `);
}

// types/db.ts
export type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};
