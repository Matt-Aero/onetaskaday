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
  getActivePlanLimit,
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
  const activePlan = db
    .prepare("SELECT 1 FROM plans WHERE user_id = ? AND active = 1")
    .get(user.id);
  redirect(activePlan ? "/today" : profile ? "/settings" : "/onboarding");
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
  reminderInterval: z.enum(["hour", "day", "week"]),
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
    reminderInterval: formData.get("reminderInterval"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const activePlanCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS value FROM plans WHERE user_id = ? AND active = 1",
      )
      .get(user.id) as { value: number }
  ).value;
  if (activePlanCount >= getActivePlanLimit(user.account_tier)) {
    return {
      error:
        "Free accounts can have two active task trees. Complete or delete one before starting another.",
    };
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
    reminder_interval: parsed.data.reminderInterval,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO profiles (
      user_id, future_vision, focus_areas, primary_goal, motivation,
      constraints_text, minutes_per_day, coaching_style, updated_at
      , reminder_interval
    ) VALUES (
      @user_id, @future_vision, @focus_areas, @primary_goal, @motivation,
      @constraints_text, @minutes_per_day, @coaching_style, @updated_at
      , @reminder_interval
    ) ON CONFLICT(user_id) DO UPDATE SET
      future_vision = excluded.future_vision,
      focus_areas = excluded.focus_areas,
      primary_goal = excluded.primary_goal,
      motivation = excluded.motivation,
      constraints_text = excluded.constraints_text,
      minutes_per_day = excluded.minutes_per_day,
      coaching_style = excluded.coaching_style,
      reminder_interval = excluded.reminder_interval,
      updated_at = excluded.updated_at`,
  ).run(profile);

  const plan = await generatePlan({ profile });
  saveNewPlan(user.id, profile, plan);
  redirect("/today");
}

const checkinSchema = z
  .object({
    taskId: z.string().uuid(),
    outcome: z.enum(["completed", "blocked", "skipped"]),
    note: z.string().trim().max(2000, "Keep your feedback under 2,000 characters."),
  })
  .superRefine((data, context) => {
    if (data.outcome !== "skipped" && data.note.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Share a little more so your next tasks can adapt.",
      });
    }
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

  const task = db
    .prepare(
      `SELECT plan_id FROM tasks
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
    )
    .get(parsed.data.taskId, user.id) as { plan_id: string } | undefined;
  if (!task) {
    return { error: "This task is no longer available to check in." };
  }

  const result = db.prepare(
    `UPDATE tasks SET status = ?, reflection = ?, blocker = ?,
     skip_feedback = ?, completed_at = ?
     WHERE id = ? AND user_id = ? AND status = 'pending'`,
  ).run(
    parsed.data.outcome,
    parsed.data.outcome === "completed" ? parsed.data.note : null,
    parsed.data.outcome === "blocked" ? parsed.data.note : null,
    parsed.data.outcome === "skipped" ? parsed.data.note || null : null,
    new Date().toISOString(),
    parsed.data.taskId,
    user.id,
  );
  if (result.changes !== 1) {
    return { error: "This task is no longer available to check in." };
  }

  await refreshFutureTasks(user.id, task.plan_id);
  revalidatePath("/today");
  revalidatePath("/history");
  return {};
}

export async function updateReminderAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({
      planId: z.string().uuid(),
      reminderInterval: z.enum(["hour", "day", "week"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/today");

  db.prepare(
    `UPDATE plans SET reminder_interval = ?
     WHERE id = ? AND user_id = ?`,
  ).run(parsed.data.reminderInterval, parsed.data.planId, user.id);

  revalidatePath("/today");
  redirect(`/today?plan=${parsed.data.planId}`);
}

export async function completeGoalAction(formData: FormData) {
  const user = await requireUser();
  const now = new Date().toISOString();
  const planId = z.string().uuid().safeParse(formData.get("planId"));
  if (!planId.success) redirect("/today");

  db.transaction(() => {
    const activePlan = db
      .prepare(
        "SELECT id FROM plans WHERE id = ? AND user_id = ? AND active = 1",
      )
      .get(planId.data, user.id) as { id: string } | undefined;

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
  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteAccountAction() {
  const user = await requireUser();
  await deleteSession();
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  redirect("/");
}

export async function deleteTreeAction(formData: FormData) {
  const user = await requireUser();
  const planId = z.string().uuid().safeParse(formData.get("planId"));
  if (!planId.success) redirect("/history");

  db.prepare("DELETE FROM plans WHERE id = ? AND user_id = ?").run(
    planId.data,
    user.id,
  );

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/settings");
  redirect("/history");
}
