import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { SignedInHeader } from "@/components/signed-in-header";
import { getActivePlanLimit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Your direction" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const activePlanCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS value FROM plans WHERE user_id = ? AND active = 1",
      )
      .get(user.id) as { value: number }
  ).value;
  if (activePlanCount >= getActivePlanLimit(user.account_tier)) {
    redirect("/today");
  }

  return (
    <main className="min-h-screen pb-20">
      <SignedInHeader user={user} maxWidth="max-w-4xl" />
      <section className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <OnboardingForm />
      </section>
    </main>
  );
}
