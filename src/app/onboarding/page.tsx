import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/onboarding-form";
import { hasProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your direction" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (hasProfile(user.id)) redirect("/today");

  return (
    <main className="min-h-screen px-6 pb-20">
      <nav className="mx-auto flex max-w-4xl items-center justify-between py-6">
        <Brand href="/today" />
        <span className="text-sm text-muted">A clearer next step</span>
      </nav>
      <section className="mx-auto max-w-2xl py-10 sm:py-16">
        <OnboardingForm />
      </section>
    </main>
  );
}
