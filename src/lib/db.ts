import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const defaultDatabasePath = path.join(dataDirectory, "one.db");

function getDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH?.trim();
  const candidatePath = configuredPath || defaultDatabasePath;

  try {
    fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
    return candidatePath;
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      fs.mkdirSync(dataDirectory, { recursive: true });
      return path.join(dataDirectory, "build.db");
    }

    throw error;
  }
}

const databasePath = getDatabasePath();

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
    account_tier TEXT NOT NULL DEFAULT 'free',
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
    reminder_interval TEXT NOT NULL DEFAULT 'day',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    strategy TEXT NOT NULL,
    future_vision TEXT,
    focus_areas TEXT,
    motivation TEXT,
    constraints_text TEXT,
    minutes_per_day INTEGER,
    coaching_style TEXT,
    reminder_interval TEXT,
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
    skip_feedback TEXT,
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

const planContextColumns = [
  ["future_vision", "TEXT"],
  ["focus_areas", "TEXT"],
  ["motivation", "TEXT"],
  ["constraints_text", "TEXT"],
  ["minutes_per_day", "INTEGER"],
  ["coaching_style", "TEXT"],
  ["reminder_interval", "TEXT"],
] as const;

for (const [name, type] of planContextColumns) {
  if (!planColumns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE plans ADD COLUMN ${name} ${type}`);
  }
}

const profileColumns = db.prepare("PRAGMA table_info(profiles)").all() as Array<{
  name: string;
}>;

if (!profileColumns.some((column) => column.name === "reminder_interval")) {
  db.exec(
    "ALTER TABLE profiles ADD COLUMN reminder_interval TEXT NOT NULL DEFAULT 'day'",
  );
}

db.exec(`
  UPDATE plans
  SET future_vision = COALESCE(
        future_vision,
        (SELECT future_vision FROM profiles WHERE profiles.user_id = plans.user_id)
      ),
      focus_areas = COALESCE(
        focus_areas,
        (SELECT focus_areas FROM profiles WHERE profiles.user_id = plans.user_id),
        '[]'
      ),
      motivation = COALESCE(
        motivation,
        (SELECT motivation FROM profiles WHERE profiles.user_id = plans.user_id),
        ''
      ),
      constraints_text = COALESCE(
        constraints_text,
        (SELECT constraints_text FROM profiles WHERE profiles.user_id = plans.user_id),
        ''
      ),
      minutes_per_day = COALESCE(
        minutes_per_day,
        (SELECT minutes_per_day FROM profiles WHERE profiles.user_id = plans.user_id),
        20
      ),
      coaching_style = COALESCE(
        coaching_style,
        (SELECT coaching_style FROM profiles WHERE profiles.user_id = plans.user_id),
        'direct'
      ),
      reminder_interval = COALESCE(
        reminder_interval,
        (SELECT reminder_interval FROM profiles WHERE profiles.user_id = plans.user_id),
        'day'
      )
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{
  name: string;
}>;

if (!userColumns.some((column) => column.name === "account_tier")) {
  db.exec("ALTER TABLE users ADD COLUMN account_tier TEXT NOT NULL DEFAULT 'free'");
}

const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{
  name: string;
}>;

if (!taskColumns.some((column) => column.name === "skip_feedback")) {
  db.exec("ALTER TABLE tasks ADD COLUMN skip_feedback TEXT");
}

export type User = {
  id: string;
  email: string;
  name: string;
  account_tier: "free" | "pro";
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
  reminder_interval: "hour" | "day" | "week";
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
  status: "pending" | "completed" | "blocked" | "skipped";
  blocker: string | null;
  reflection: string | null;
  skip_feedback: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  user_id: string;
  goal: string;
  strategy: string;
  future_vision: string;
  focus_areas: string;
  motivation: string;
  constraints_text: string;
  minutes_per_day: number;
  coaching_style: "gentle" | "direct" | "challenging";
  reminder_interval: "hour" | "day" | "week";
  created_at: string;
  completed_at: string | null;
  active: number;
};
