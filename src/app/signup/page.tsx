import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/today");

  return (
    <main className="min-h-screen px-6">
      <nav className="mx-auto max-w-6xl py-6">
        <Brand />
      </nav>
      <section className="mx-auto w-full max-w-md py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Begin with one
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Make progress simpler.
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          A few thoughtful questions, then one useful action for today.
        </p>
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}
