"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { db, type Profile } from "@/lib/db";
import { generatePlan, refreshFutureTasks, saveNewPlan } from "@/lib/planner";

export type FormState = { error?: string };

const authSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signupAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = authSchema
    .extend({ name: z.string().trim().min(2, "Enter your name.") })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  try {
    if (findUserByEmail(parsed.data.email)) {
      return { error: "An account already exists for this email." };
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = createUser(
      parsed.data.name,
      parsed.data.email,
      passwordHash,
    );
    await createSession(user.id);
    redirect("/onboarding");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return { error: "Could not create your account. Please try again." };
  }
}

export async function signinAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const user = findUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return { error: "Email or password is incorrect." };
  }

  await createSession(user.id);
  const profile = db
    .prepare("SELECT 1 FROM profiles WHERE user_id = ?")
    .get(user.id);
  redirect(profile ? "/today" : "/onboarding");
}

export async function signoutAction() {
  await deleteSession();
  redirect("/");
}

const onboardingSchema = z.object({
  futureVision: z.string().trim().min(20, "Tell us a little more about the life you want."),
  focusAreas: z.array(z.string()).min(1, "Choose at least one area."),
  primaryGoal: z.string().trim().min(10, "Make the first focus a little more specific."),
  motivation: z.string().trim().min(10, "Tell us why this matters."),
  constraints: z.string().trim().min(2, "Enter a constraint, or write “none”."),
  minutesPerDay: z.coerce.number().int().min(10).max(120),
  coachingStyle: z.enum(["gentle", "direct", "challenging"]),
});

export async function onboardingAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({
    futureVision: formData.get("futureVision"),
    focusAreas: formData.getAll("focusAreas"),
    primaryGoal: formData.get("primaryGoal"),
    motivation: formData.get("motivation"),
    constraints: formData.get("constraints"),
    minutesPerDay: formData.get("minutesPerDay"),
    coachingStyle: formData.get("coachingStyle"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const profile: Profile = {
    user_id: user.id,
    future_vision: parsed.data.futureVision,
    focus_areas: JSON.stringify(parsed.data.focusAreas),
    primary_goal: parsed.data.primaryGoal,
    motivation: parsed.data.motivation,
    constraints_text: parsed.data.constraints,
    minutes_per_day: parsed.data.minutesPerDay,
    coaching_style: parsed.data.coachingStyle,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO profiles (
      user_id, future_vision, focus_areas, primary_goal, motivation,
      constraints_text, minutes_per_day, coaching_style, updated_at
    ) VALUES (
      @user_id, @future_vision, @focus_areas, @primary_goal, @motivation,
      @constraints_text, @minutes_per_day, @coaching_style, @updated_at
    ) ON CONFLICT(user_id) DO UPDATE SET
      future_vision = excluded.future_vision,
      focus_areas = excluded.focus_areas,
      primary_goal = excluded.primary_goal,
      motivation = excluded.motivation,
      constraints_text = excluded.constraints_text,
      minutes_per_day = excluded.minutes_per_day,
      coaching_style = excluded.coaching_style,
      updated_at = excluded.updated_at`,
  ).run(profile);

  const plan = await generatePlan({ profile });
  saveNewPlan(user.id, profile, plan);
  redirect("/today");
}

const checkinSchema = z.object({
  taskId: z.string().uuid(),
  outcome: z.enum(["completed", "blocked"]),
  note: z
    .string()
    .trim()
    .min(10, "Share a little more so your next tasks can adapt.")
    .max(2000, "Keep your reflection under 2,000 characters."),
});

export async function checkinAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = checkinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check-in could not be saved." };
  }

  const field =
    parsed.data.outcome === "completed" ? "reflection" : "blocker";
  const result = db.prepare(
    `UPDATE tasks SET status = ?, ${field} = ?, completed_at = ?
     WHERE id = ? AND user_id = ? AND status = 'pending'`,
  ).run(
    parsed.data.outcome,
    parsed.data.note,
    new Date().toISOString(),
    parsed.data.taskId,
    user.id,
  );
  if (result.changes !== 1) {
    return { error: "This task is no longer available to check in." };
  }

  await refreshFutureTasks(user.id);
  revalidatePath("/today");
  revalidatePath("/history");
  return {};
}

export async function completeGoalAction() {
  const user = await requireUser();
  const now = new Date().toISOString();

  db.transaction(() => {
    const activePlan = db
      .prepare("SELECT id FROM plans WHERE user_id = ? AND active = 1")
      .get(user.id) as { id: string } | undefined;

    if (!activePlan) return;

    db.prepare(
      `DELETE FROM tasks
       WHERE plan_id = ? AND user_id = ? AND status = 'pending'`,
    ).run(activePlan.id, user.id);
    db.prepare(
      `UPDATE plans SET active = 0, completed_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(now, activePlan.id, user.id);
  })();

  revalidatePath("/today");
  revalidatePath("/history");
  redirect("/history");
}

export async function restartAction() {
  const user = await requireUser();
  db.transaction(() => {
    db.prepare(
      "UPDATE plans SET active = 0 WHERE user_id = ? AND active = 1",
    ).run(user.id);
    db.prepare("DELETE FROM profiles WHERE user_id = ?").run(user.id);
  })();
  revalidatePath("/today");
  revalidatePath("/history");
  redirect("/onboarding");
}
