import type { Metadata } from "next";
import { Clock, Lightbulb } from "lucide-react";
import { redirect } from "next/navigation";
import { completeGoalAction } from "@/app/actions";
import { Checkin } from "@/components/checkin";
import { ReminderControl } from "@/components/reminder-control";
import { SignedInHeader } from "@/components/signed-in-header";
import { hasProfile, requireUser } from "@/lib/auth";
import { db, type Task } from "@/lib/db";
import { clsx } from "clsx";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await requireUser();
  if (!hasProfile(user.id)) redirect("/onboarding");
  const requestedPlanId = (await searchParams).plan;

  const plan = (
    requestedPlanId
      ? db
          .prepare(
            `SELECT id, goal, strategy, reminder_interval FROM plans
             WHERE id = ? AND user_id = ? AND active = 1`,
          )
          .get(requestedPlanId, user.id)
      : db
          .prepare(
            `SELECT id, goal, strategy, reminder_interval FROM plans
             WHERE user_id = ? AND active = 1
             ORDER BY created_at DESC
             LIMIT 1`,
          )
          .get(user.id)
  ) as
    | {
        id: string;
        goal: string;
        strategy: string;
        reminder_interval: "hour" | "day" | "week";
      }
    | undefined;

  if (!plan && requestedPlanId) redirect("/today");
  if (!plan) redirect("/onboarding");

  const tasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE plan_id = ? AND status = 'pending'
       ORDER BY task_date ASC, day_index ASC`,
    )
    .all(plan.id) as Task[];

  const currentTask = tasks[0];
  if (!currentTask) redirect("/history");

  return (
    <main className="min-h-screen pb-20">
      <SignedInHeader
        user={user}
        homeHref={`/today?plan=${plan.id}`}
        maxWidth="max-w-5xl"
      />

      <section className="mx-auto mt-8 grid max-w-5xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Your next move
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                Ready when you are
              </h1>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted shadow-sm">
              Task {currentTask.day_index}
            </span>
          </div>

          <article className="soft-shadow rounded-[2rem] border border-white bg-white p-6 sm:p-9">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="size-4" />
              {currentTask.duration_minutes} minutes
            </div>
            <h2 className="mt-8 max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl">
              {currentTask.title}
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {currentTask.action_text}
            </p>

            <div className="mt-8 rounded-3xl border border-line bg-paper/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Done means
              </p>
              <p className="mt-2 text-sm leading-6">
                {currentTask.success_measure}
              </p>
            </div>

            <Checkin key={currentTask.id} taskId={currentTask.id} />
          </article>

          <div className="mt-6 flex items-start gap-3 px-2 text-sm leading-6 text-muted">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>{currentTask.rationale}</p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-line bg-white/65 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Up next
          </p>
          <div className="mt-5 space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={clsx(
                  "flex gap-3 rounded-2xl p-3 transition",
                  task.id === currentTask.id && "bg-white shadow-sm",
                )}
              >
                <span
                  className={clsx(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                    task.id === currentTask.id &&
                      "border-ink bg-ink text-white",
                    task.id !== currentTask.id &&
                      "border-line text-muted",
                  )}
                >
                  {task.day_index}
                </span>
                <div>
                  <p
                    className={clsx(
                      "text-sm font-medium leading-5",
                      task.id !== currentTask.id && "text-muted",
                    )}
                  >
                    {task.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Focus
            </p>
            <p className="mt-2 text-sm font-medium leading-6">{plan.goal}</p>
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <p className="text-xs leading-5 text-muted">
              Tasks keep adapting until you decide this goal is accomplished.
            </p>
            <form action={completeGoalAction} className="mt-3">
              <input type="hidden" name="planId" value={plan.id} />
              <button
                type="submit"
                className="focus-ring text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                Mark goal accomplished
              </button>
            </form>
          </div>
          <ReminderControl
            planId={plan.id}
            taskId={currentTask.id}
            taskTitle={currentTask.title}
            interval={plan.reminder_interval}
          />
        </aside>
      </section>
    </main>
  );
}
