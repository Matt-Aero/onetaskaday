import "server-only";

import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db, type User } from "@/lib/db";

const SESSION_COOKIE = "one_session";
const SESSION_DAYS = 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function createUser(name: string, email: string, passwordHash: string) {
  const user = {
    id: randomUUID(),
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES (@id, @name, @email, @password_hash, @created_at)`,
  ).run(user);

  return user;
}

export function findUserByEmail(email: string) {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | (User & { password_hash: string })
    | undefined;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + SESSION_DAYS);

  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(tokenHash(token), userId, expires.toISOString(), now.toISOString());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = db
    .prepare(
      `SELECT users.id, users.email, users.name, users.created_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(tokenHash(token), new Date().toISOString()) as User | undefined;

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export function hasProfile(userId: string) {
  return Boolean(
    db.prepare("SELECT 1 FROM profiles WHERE user_id = ?").get(userId),
  );
}
