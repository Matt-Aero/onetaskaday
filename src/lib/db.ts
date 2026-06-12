import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath =
  process.env.DATABASE_PATH ?? path.join(dataDirectory, "one.db");

const globalForDatabase = globalThis as unknown as {
  oneDatabase?: Database.Database;
};

export const db =
  globalForDatabase.oneDatabase ??
  new Database(databasePath, {
    fileMustExist: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.oneDatabase = db;
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    future_vision TEXT NOT NULL,
    focus_areas TEXT NOT NULL,
    primary_goal TEXT NOT NULL,
    motivation TEXT NOT NULL,
    constraints_text TEXT NOT NULL,
    minutes_per_day INTEGER NOT NULL,
    coaching_style TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    strategy TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date TEXT NOT NULL,
    day_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    action_text TEXT NOT NULL,
    rationale TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    success_measure TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    blocker TEXT,
    reflection TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_date
    ON tasks(user_id, task_date);
`);

const planColumns = db.prepare("PRAGMA table_info(plans)").all() as Array<{
  name: string;
}>;

if (!planColumns.some((column) => column.name === "completed_at")) {
  db.exec("ALTER TABLE plans ADD COLUMN completed_at TEXT");
}

export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

export type Profile = {
  user_id: string;
  future_vision: string;
  focus_areas: string;
  primary_goal: string;
  motivation: string;
  constraints_text: string;
  minutes_per_day: number;
  coaching_style: string;
  updated_at: string;
};

export type Task = {
  id: string;
  plan_id: string;
  user_id: string;
  task_date: string;
  day_index: number;
  title: string;
  action_text: string;
  rationale: string;
  duration_minutes: number;
  success_measure: string;
  status: "pending" | "completed" | "blocked";
  blocker: string | null;
  reflection: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  user_id: string;
  goal: string;
  strategy: string;
  created_at: string;
  completed_at: string | null;
  active: number;
};
