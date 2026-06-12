import type { Metadata } from "next";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, CircleSlash2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { restartAction } from "@/app/actions";
import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { db, type Plan, type Task } from "@/lib/db";

export const metadata: Metadata = { title: "History" };

type HistoryTask = Task & { goal: string };

export default async function HistoryPage() {
  const user = await requireUser();
  const tasks = db
    .prepare(
      `SELECT tasks.*, plans.goal
       FROM tasks
       JOIN plans ON plans.id = tasks.plan_id
       WHERE tasks.user_id = ? AND tasks.status != 'pending'
       ORDER BY tasks.completed_at DESC`,
    )
    .all(user.id) as HistoryTask[];
  const plans = db
    .prepare(
      `SELECT * FROM plans WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(user.id) as Plan[];
  const activePlan = plans.find((plan) => plan.active === 1);

  return (
    <main className="min-h-screen px-5 pb-20 sm:px-6">
      <nav className="mx-auto flex max-w-4xl items-center justify-between py-6">
        <Brand href={activePlan ? "/today" : "/"} />
        {activePlan ? (
          <Link
            href="/today"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" />
            Back to today
          </Link>
        ) : null}
      </nav>

      <section className="mx-auto max-w-4xl py-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Your progress
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Task history
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted">
              A record of what you tried, what happened, and what your coach used
              to shape the next move.
            </p>
          </div>
          <form action={restartAction}>
            <button
              type="submit"
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold"
            >
              <RotateCcw className="size-4" />
              Start over
            </button>
          </form>
        </div>

        {plans[0]?.completed_at ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <p className="text-sm font-semibold">Goal accomplished</p>
            <p className="mt-1 text-sm leading-6">
              {plans[0].goal} · {format(parseISO(plans[0].completed_at), "MMMM d, yyyy")}
            </p>
          </div>
        ) : null}

        <div className="mt-10 space-y-4">
          {tasks.length ? (
            tasks.map((task) => {
              const note = task.reflection ?? task.blocker;
              const completed = task.status === "completed";

              return (
                <article
                  key={task.id}
                  className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
                        completed
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {completed ? (
                        <Check className="size-4" />
                      ) : (
                        <CircleSlash2 className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold">{task.title}</p>
                        <span className="text-xs text-muted">
                          {format(parseISO(task.task_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted">{task.goal}</p>
                      <p className="mt-4 text-sm leading-6 text-ink">{note}</p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-line p-8 text-center text-sm leading-6 text-muted">
              Completed and blocked tasks will appear here after your first check-in.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
