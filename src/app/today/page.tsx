import type { Metadata } from "next";
import { format, parseISO } from "date-fns";
import { Clock, History, Lightbulb, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { completeGoalAction, signoutAction } from "@/app/actions";
import { Brand } from "@/components/brand";
import { Checkin } from "@/components/checkin";
import { hasProfile, requireUser } from "@/lib/auth";
import { db, type Task } from "@/lib/db";
import { clsx } from "clsx";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  if (!hasProfile(user.id)) redirect("/onboarding");

  const plan = db
    .prepare(
      "SELECT id, goal, strategy FROM plans WHERE user_id = ? AND active = 1",
    )
    .get(user.id) as
    | { id: string; goal: string; strategy: string }
    | undefined;

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
    <main className="min-h-screen px-5 pb-20 sm:px-6">
      <nav className="mx-auto flex max-w-5xl items-center justify-between py-6">
        <Brand href="/today" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            Hi, {user.name.split(" ")[0]}
          </span>
          <Link
            href="/history"
            aria-label="View history"
            className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink"
          >
            <History className="size-4" />
          </Link>
          <form action={signoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </nav>

      <section className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Your next move
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                {format(parseISO(currentTask.task_date), "EEEE, MMMM d")}
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

            <Checkin taskId={currentTask.id} />
          </article>

          <div className="mt-6 flex items-start gap-3 px-2 text-sm leading-6 text-muted">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>{currentTask.rationale}</p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-line bg-white/65 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Next three tasks
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
                  <p className="text-xs text-muted">
                    {format(parseISO(task.task_date), "EEE, MMM d")}
                  </p>
                  <p
                    className={clsx(
                      "mt-1 text-sm font-medium leading-5",
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
              <button
                type="submit"
                className="focus-ring text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                Mark goal accomplished
              </button>
            </form>
          </div>
        </aside>
      </section>
    </main>
  );
}
