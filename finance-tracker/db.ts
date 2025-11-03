// db.ts
import { openDatabaseSync } from "expo-sqlite";

export const db = openDatabaseSync("finance.db");

// Run once on app start

export async function ensureSchema() {
  // Base schema

  await db.execAsync(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  -- USERS
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL,
    email         TEXT
  );

  -- EXPENSES (shared)
  CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT PRIMARY KEY,
    description  TEXT,
    category     TEXT,
    amount       REAL NOT NULL,
    currency     TEXT DEFAULT 'CAD',
    date         INTEGER NOT NULL,
    created_by   TEXT,          -- who created in the app
    payer_id     TEXT,          -- who actually paid
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (payer_id)   REFERENCES users(id) ON DELETE SET NULL
  );

  -- EXPENSE PARTICIPANTS (each row = what one user owes on an expense)
  CREATE TABLE IF NOT EXISTS expense_participants (
    expense_id   TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    share        REAL NOT NULL,
    PRIMARY KEY (expense_id, user_id),
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
  );

  -- SETTLEMENTS (manual “paid X to Y” records)
  CREATE TABLE IF NOT EXISTS settlements (
    id        TEXT PRIMARY KEY,
    payer_id  TEXT NOT NULL,
    payee_id  TEXT NOT NULL,
    amount    REAL NOT NULL,
    date      INTEGER NOT NULL,
    note      TEXT,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- BUDGETS (optional future use)
  CREATE TABLE IF NOT EXISTS category_budgets (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL,
    category  TEXT NOT NULL,
    month     INTEGER NOT NULL, -- YYYYMM
    amount    REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- PERSONAL SPENDING (doesn't affect owings)
  CREATE TABLE IF NOT EXISTS personal_spend (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL,
    amount    REAL NOT NULL,
    budget_id TEXT,
    date      INTEGER NOT NULL,
    note      TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

    -- Budgets (per user, per month)
  CREATE TABLE IF NOT EXISTS budgets (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL,
    name      TEXT NOT NULL,
    month     INTEGER NOT NULL,   -- YYYYMM
    amount    REAL NOT NULL,      -- monthly cap
    UNIQUE (user_id, name, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );


  -- Helpful indexes
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_personal_spend_date ON personal_spend(date);
  CREATE INDEX IF NOT EXISTS idx_expense_participants_user ON expense_participants(user_id);
  CREATE INDEX IF NOT EXISTS idx_settlements_payer ON settlements(payer_id);
  CREATE INDEX IF NOT EXISTS idx_settlements_payee ON settlements(payee_id);
`);

  // Lightweight migration: add payer_id to expenses if missing
  try {
    await db.execAsync(`ALTER TABLE expenses ADD COLUMN payer_id TEXT;`);
  } catch {
    // ignore if column already exists
  }

  // Seed a "Me" user (for convenience)
  await db.execAsync(`
    INSERT OR IGNORE INTO users (id, display_name, email)
    VALUES ('me', 'Me', NULL);
  `);
}
