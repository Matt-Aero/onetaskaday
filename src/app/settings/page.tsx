import type { Metadata } from "next";
import { ArrowRight, LifeBuoy, ListTree } from "lucide-react";
import Link from "next/link";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { SignedInHeader } from "@/components/signed-in-header";
import { getActivePlanLimit, requireUser } from "@/lib/auth";
import { db, type Plan } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

const supportEmail = process.env.SUPPORT_EMAIL ?? "support@onetaskaday.app";

export default async function SettingsPage() {
  const user = await requireUser();
  const plans = db
    .prepare(
      `SELECT * FROM plans WHERE user_id = ?
       ORDER BY active DESC, created_at DESC`,
    )
    .all(user.id) as Plan[];
  const activePlans = plans.filter((plan) => plan.active === 1);
  const activeLimit = getActivePlanLimit(user.account_tier);
  const canStartTree = activePlans.length < activeLimit;

  return (
    <main className="min-h-screen pb-20">
      <SignedInHeader
        user={user}
        homeHref={activePlans[0] ? `/today?plan=${activePlans[0].id}` : "/settings"}
        maxWidth="max-w-4xl"
      />

      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Your account
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Settings
        </h1>

        <div className="mt-10 grid gap-5">
          <section className="rounded-[1.75rem] border border-line bg-surface p-6 sm:p-7">
            <h2 className="text-lg font-semibold">Profile</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="mt-1 font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-1 font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Plan</dt>
                <dd className="mt-1 font-medium capitalize">{user.account_tier}</dd>
              </div>
              <div>
                <dt className="text-muted">Active task trees</dt>
                <dd className="mt-1 font-medium">
                  {activePlans.length} of {activeLimit}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[1.75rem] border border-line bg-surface p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper">
                <ListTree className="size-4" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Task trees</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Review every current and previous goal with its complete check-in
                  history.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/history"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  >
                    View all trees
                    <ArrowRight className="size-4" />
                  </Link>
                  {canStartTree ? (
                    <Link
                      href="/onboarding"
                      className="focus-ring rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                    >
                      Start a new tree
                    </Link>
                  ) : (
                    <span className="rounded-full bg-paper px-4 py-2 text-sm text-muted">
                      Free accounts allow two active trees
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-line bg-surface p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper">
                <LifeBuoy className="size-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Support</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Questions, feedback, or account help.
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="focus-ring mt-3 inline-block rounded font-semibold underline decoration-line underline-offset-4"
                >
                  {supportEmail}
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-red-200 bg-surface p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-red-900">Danger zone</h2>
            <p className="mt-2 mb-5 text-sm leading-6 text-muted">
              Account deletion cannot be undone.
            </p>
            <DeleteAccountForm />
          </section>
        </div>
      </section>
    </main>
  );
}
