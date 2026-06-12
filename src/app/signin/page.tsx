import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SigninPage() {
  if (await getCurrentUser()) redirect("/today");

  return (
    <main className="min-h-screen px-6">
      <nav className="mx-auto max-w-6xl py-6">
        <Brand />
      </nav>
      <section className="mx-auto w-full max-w-md py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Welcome back
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Your next step is waiting.
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Sign in to see today&apos;s action and keep your plan moving.
        </p>
        <AuthForm mode="signin" />
      </section>
    </main>
  );
}
