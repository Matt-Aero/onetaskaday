"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signinAction,
  signupAction,
  type FormState,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: FormState = {};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const action = mode === "signin" ? signinAction : signupAction;
  const [state, formAction] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="mt-10 space-y-5">
      {isSignup && (
        <Field label="First name" name="name" type="text" autoComplete="name" />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        hint={isSignup ? "At least 8 characters" : undefined}
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full" pendingLabel={isSignup ? "Creating..." : "Signing in..."}>
        {isSignup ? "Create account" : "Continue"}
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account?" : "New to One?"}{" "}
        <Link
          className="focus-ring rounded font-semibold text-ink underline decoration-line underline-offset-4"
          href={isSignup ? "/signin" : "/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm font-medium">
        {label}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      <input
        required
        {...props}
        className="focus-ring h-13 w-full rounded-2xl border border-line bg-white px-4 text-[15px] shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-300"
      />
    </label>
  );
}
