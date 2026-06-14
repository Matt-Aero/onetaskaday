import type { Metadata } from "next";
import { format, parseISO } from "date-fns";
import { Check, CircleSlash2, Plus, SkipForward } from "lucide-react";
import Link from "next/link";
import { DeleteTreeForm } from "@/components/delete-tree-form";
import { SignedInHeader } from "@/components/signed-in-header";
import { getActivePlanLimit, requireUser } from "@/lib/auth";
import { db, type Plan, type Task } from "@/lib/db";

export const metadata: Metadata = { title: "Task trees" };

type PlanWithCounts = Plan & {
  completed_count: number;
  blocked_count: number;
  skipped_count: number;
  pending_count: number;
};

export default async function HistoryPage() {
  const user = await requireUser();
  const plans = db
    .prepare(
      `SELECT plans.*,
        SUM(CASE WHEN tasks.status = 'completed' THEN 1 ELSE 0 END) completed_count,
        SUM(CASE WHEN tasks.status = 'blocked' THEN 1 ELSE 0 END) blocked_count,
        SUM(CASE WHEN tasks.status = 'skipped' THEN 1 ELSE 0 END) skipped_count,
        SUM(CASE WHEN tasks.status = 'pending' THEN 1 ELSE 0 END) pending_count
       FROM plans
       LEFT JOIN tasks ON tasks.plan_id = plans.id
       WHERE plans.user_id = ?
       GROUP BY plans.id
       ORDER BY plans.active DESC, plans.created_at DESC`,
    )
    .all(user.id) as PlanWithCounts[];

  const tasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE user_id = ? AND status != 'pending'
       ORDER BY completed_at DESC`,
    )
    .all(user.id) as Task[];
  const tasksByPlan = Map.groupBy(tasks, (task) => task.plan_id);
  const activePlan = plans.find((plan) => plan.active === 1);
  const activePlanCount = plans.filter((plan) => plan.active === 1).length;
  const canCreateTree =
    activePlanCount < getActivePlanLimit(user.account_tier);

  return (
    <main className="min-h-screen pb-20">
      <SignedInHeader
        user={user}
        homeHref={activePlan ? `/today?plan=${activePlan.id}` : "/settings"}
        maxWidth="max-w-4xl"
      />

      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Your progress
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Task trees
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted">
              Every goal keeps its own sequence, decisions, and check-ins.
            </p>
          </div>
          {canCreateTree ? (
            <Link
              href="/onboarding"
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              <Plus className="size-4" />
              Create new tree
            </Link>
          ) : (
            <span className="rounded-full bg-white px-4 py-2 text-sm text-muted">
              Two active trees maximum
            </span>
          )}
        </div>

        <div className="mt-10 space-y-6">
          {plans.length ? (
            plans.map((plan) => {
              const planTasks = tasksByPlan.get(plan.id) ?? [];
              return (
                <article
                  key={plan.id}
                  className="rounded-[2rem] border border-line bg-white p-5 sm:p-7"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            plan.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-paper text-muted"
                          }`}
                        >
                          {plan.active ? "Active" : "Finished"}
                        </span>
                        <span className="text-xs text-muted">
                          Started {format(parseISO(plan.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">
                        {plan.goal}
                      </h2>
                    </div>
                    {plan.active && (
                      <Link
                        href={`/today?plan=${plan.id}`}
                        className="focus-ring rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-white"
                      >
                        Open tree
                      </Link>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full bg-paper px-3 py-1.5">
                      {plan.completed_count} completed
                    </span>
                    <span className="rounded-full bg-paper px-3 py-1.5">
                      {plan.blocked_count} blocked
                    </span>
                    <span className="rounded-full bg-paper px-3 py-1.5">
                      {plan.skipped_count} skipped
                    </span>
                    {plan.active ? (
                      <span className="rounded-full bg-paper px-3 py-1.5">
                        {plan.pending_count} queued
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3 border-t border-line pt-5">
                    {planTasks.length ? (
                      planTasks.map((task) => {
                        const completed = task.status === "completed";
                        const skipped = task.status === "skipped";
                        return (
                          <div key={task.id} className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
                                completed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : skipped
                                    ? "bg-zinc-100 text-zinc-600"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {completed ? (
                                <Check className="size-4" />
                              ) : skipped ? (
                                <SkipForward className="size-4" />
                              ) : (
                                <CircleSlash2 className="size-4" />
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-semibold">{task.title}</p>
                              <p className="mt-1 text-sm leading-6 text-muted">
                                {task.reflection ??
                                  task.blocker ??
                                  task.skip_feedback ??
                                  "Skipped without feedback."}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted">No check-ins recorded yet.</p>
                    )}
                  </div>
                  <div className="mt-5 border-t border-line pt-5">
                    <DeleteTreeForm planId={plan.id} />
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-line p-8 text-center text-sm text-muted">
              Your task trees will appear here.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
