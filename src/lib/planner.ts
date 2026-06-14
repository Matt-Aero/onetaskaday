import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { format } from "date-fns";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, type Plan, type Profile, type Task } from "@/lib/db";

const PlanSchema = z.object({
  strategy: z.string(),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        action: z.string(),
        rationale: z.string(),
        durationMinutes: z.number().int().min(5).max(120),
        successMeasure: z.string(),
      }),
    )
    .length(3),
});

export type GeneratedPlan = z.infer<typeof PlanSchema>;

type HistoryTask = Pick<
  Task,
  | "task_date"
  | "title"
  | "action_text"
  | "status"
  | "blocker"
  | "reflection"
  | "skip_feedback"
>;

type UpcomingTask = Pick<
  Task,
  | "task_date"
  | "title"
  | "action_text"
  | "rationale"
  | "duration_minutes"
  | "success_measure"
>;

type PlanningContext = {
  profile: Profile;
  history?: HistoryTask[];
  upcoming?: UpcomingTask[];
};

function fallbackPlan({
  profile,
  history = [],
  upcoming = [],
}: PlanningContext): GeneratedPlan {
  const goal = profile.primary_goal.trim();
  const minutes = Math.min(Math.max(profile.minutes_per_day, 10), 60);
  const latestLearning =
    history[0]?.reflection ??
    history[0]?.blocker ??
    history[0]?.skip_feedback;
  const existing = upcoming.slice(0, 2).map((task) => ({
    title: task.title,
    action: task.action_text,
    rationale: task.rationale,
    durationMinutes: task.duration_minutes,
    successMeasure: task.success_measure,
  }));

  const adaptiveTasks: GeneratedPlan["tasks"] = [
    {
      title: latestLearning ? "Act on what you learned" : "Define the next visible result",
      action: latestLearning
        ? `Set a ${minutes}-minute timer. Write the most important implication of this result: "${latestLearning}". Then take one concrete step toward "${goal}" that responds to it.`
        : `Set a ${minutes}-minute timer. Write one sentence describing what meaningful progress on "${goal}" would look like in the next 30 days, then list the three biggest unknowns standing in the way.`,
      rationale:
        "The next action should respond to evidence instead of following a static plan.",
      durationMinutes: minutes,
      successMeasure:
        "One implication is written down and one responsive action is completed.",
    },
    {
      title: "Gather one decisive piece of evidence",
      action: `Choose the most important remaining unknown about "${goal}". Spend ${minutes} minutes getting one real answer through research, a conversation, or a small test.`,
      rationale:
        "Useful evidence reveals whether to continue, adjust, or replace the current approach.",
      durationMinutes: minutes,
      successMeasure: "You can state one new fact and what it changes about your next move.",
    },
    {
      title: "Turn the evidence into a commitment",
      action: `Use what you learned to schedule, send, prepare, or complete one concrete next step toward "${goal}". Put the following action on your calendar before you stop.`,
      rationale:
        "Progress compounds when each task makes the next useful action easier to start.",
      durationMinutes: minutes,
      successMeasure: "A real-world action is completed and the next step has a time.",
    },
  ];

  return {
    strategy:
      "Use each result as evidence, address the biggest current uncertainty, and keep the next action small enough to complete.",
    tasks: latestLearning
      ? [adaptiveTasks[0], ...existing, ...adaptiveTasks.slice(1)].slice(0, 3)
      : [...existing, ...adaptiveTasks].slice(0, 3),
  };
}

export async function generatePlan(
  context: PlanningContext,
): Promise<GeneratedPlan> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackPlan(context);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const focusAreas = JSON.parse(context.profile.focus_areas) as string[];

  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      reasoning: { effort: "low" },
      input: [
        {
          role: "developer",
          content: `You are the planning engine for One, an adaptive action coach.
Create exactly the next three sequential tasks that best move the user toward
their stated goal. The goal continues until the user explicitly marks it accomplished.
Treat completed-task reflections, blockers, and skip feedback as real evidence:
infer implications, notice failed assumptions, and pivot the strategy when results
call for it. Tasks advance whenever the user checks in; do not assume a daily cadence. You may
keep all, some, or none of the current upcoming tasks. Do not change tasks merely for
variety. Each task must be concrete, safe, possible in the user's time budget, and
produce an observable result that gives the next planning cycle useful information.
Avoid vague advice, motivational filler, diagnosis, therapy, or high-stakes medical,
legal, financial, or relationship directives. For sensitive goals, prefer reflection,
information gathering, support from trusted people, and qualified professionals.
Never make a major life decision for the user. Use your full reasoning ability to
connect evidence to the next best action without overwhelming the user.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            futureVision: context.profile.future_vision,
            focusAreas,
            goal: context.profile.primary_goal,
            motivation: context.profile.motivation,
            constraints: context.profile.constraints_text,
            minutesPerDay: context.profile.minutes_per_day,
            coachingStyle: context.profile.coaching_style,
            recentTaskHistory: context.history ?? [],
            currentUpcomingTasks: context.upcoming ?? [],
          }),
        },
      ],
      text: {
        format: zodTextFormat(PlanSchema, "three_task_plan"),
      },
    });

    return response.output_parsed ?? fallbackPlan(context);
  } catch (error) {
    console.error("OpenAI plan generation failed; using fallback.", error);
    return fallbackPlan(context);
  }
}

export function saveNewPlan(userId: string, profile: Profile, plan: GeneratedPlan) {
  const now = new Date().toISOString();
  const planId = randomUUID();

  const save = db.transaction(() => {
    const insertTask = db.prepare(
      `INSERT INTO tasks (
        id, plan_id, user_id, task_date, day_index, title, action_text,
        rationale, duration_minutes, success_measure, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    );

    db.prepare(
      `INSERT INTO plans (
        id, user_id, goal, strategy, future_vision, focus_areas, motivation,
        constraints_text, minutes_per_day, coaching_style, created_at, active
        , reminder_interval
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).run(
      planId,
      userId,
      profile.primary_goal,
      plan.strategy,
      profile.future_vision,
      profile.focus_areas,
      profile.motivation,
      profile.constraints_text,
      profile.minutes_per_day,
      profile.coaching_style,
      now,
      profile.reminder_interval,
    );

    plan.tasks.forEach((task, index) => {
      insertTask.run(
        randomUUID(),
        planId,
        userId,
        format(new Date(), "yyyy-MM-dd"),
        index + 1,
        task.title,
        task.action,
        task.rationale,
        task.durationMinutes,
        task.successMeasure,
        now,
      );
    });
  });

  save();
}

export async function refreshFutureTasks(userId: string, planId: string) {
  const activePlan = db
    .prepare(
      "SELECT * FROM plans WHERE id = ? AND user_id = ? AND active = 1",
    )
    .get(planId, userId) as Plan | undefined;

  if (!activePlan) return;

  const profile: Profile = {
    user_id: userId,
    future_vision: activePlan.future_vision,
    focus_areas: activePlan.focus_areas,
    primary_goal: activePlan.goal,
    motivation: activePlan.motivation,
    constraints_text: activePlan.constraints_text,
    minutes_per_day: activePlan.minutes_per_day,
    coaching_style: activePlan.coaching_style,
    reminder_interval: activePlan.reminder_interval,
    updated_at: activePlan.created_at,
  };

  const history = db
    .prepare(
      `SELECT task_date, title, action_text, status, blocker, reflection,
              skip_feedback
       FROM tasks
       WHERE user_id = ? AND plan_id = ? AND status != 'pending'
       ORDER BY completed_at DESC LIMIT 12`,
    )
    .all(userId, activePlan.id) as HistoryTask[];
  const future = db
    .prepare(
      `SELECT * FROM tasks
       WHERE plan_id = ? AND status = 'pending'
       ORDER BY task_date ASC, day_index ASC`,
    )
    .all(activePlan.id) as Task[];
  const plan = await generatePlan({ profile, history, upcoming: future });
  const maxDayIndex = (
    db
      .prepare(
        `SELECT COALESCE(MAX(day_index), 0) AS value FROM tasks
         WHERE plan_id = ?`,
      )
      .get(activePlan.id) as { value: number }
  ).value;

  const update = db.prepare(
    `UPDATE tasks SET title = ?, action_text = ?, rationale = ?,
     duration_minutes = ?, success_measure = ? WHERE id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO tasks (
      id, plan_id, user_id, task_date, day_index, title, action_text,
      rationale, duration_minutes, success_measure, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  );

  const transaction = db.transaction(() => {
    const excess = future.slice(3);
    const remove = db.prepare("DELETE FROM tasks WHERE id = ?");
    excess.forEach((task) => remove.run(task.id));

    plan.tasks.forEach((task, index) => {
      const existing = future[index];
      if (existing) {
        update.run(
          task.title,
          task.action,
          task.rationale,
          task.durationMinutes,
          task.successMeasure,
          existing.id,
        );
        return;
      }

      const dateOffset = index - future.length + 1;
      insert.run(
        randomUUID(),
        activePlan.id,
        userId,
        format(new Date(), "yyyy-MM-dd"),
        maxDayIndex + dateOffset,
        task.title,
        task.action,
        task.rationale,
        task.durationMinutes,
        task.successMeasure,
        new Date().toISOString(),
      );
    });

    db.prepare("UPDATE plans SET strategy = ? WHERE id = ?").run(
      plan.strategy,
      activePlan.id,
    );
  });
  transaction();
}
