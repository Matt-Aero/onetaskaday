"use client";

import { Check, SkipForward, X } from "lucide-react";
import { useActionState, useState } from "react";
import { checkinAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { clsx } from "clsx";

const initialState: FormState = {};

export function Checkin({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(checkinAction, initialState);
  const [outcome, setOutcome] = useState<
    "completed" | "blocked" | "skipped" | null
  >(null);

  if (!outcome) {
    return (
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setOutcome("completed")}
          className="focus-ring flex h-13 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-black"
        >
          <Check className="size-4" />
          I did it
        </button>
        <button
          type="button"
          onClick={() => setOutcome("blocked")}
          className="focus-ring flex h-13 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold transition hover:border-accent"
        >
          <X className="size-4" />
          I got stuck
        </button>
        <button
          type="button"
          onClick={() => setOutcome("skipped")}
          className="focus-ring flex h-13 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold transition hover:border-accent"
        >
          <SkipForward className="size-4" />
          Skip task
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 rounded-3xl bg-paper p-5">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="outcome" value={outcome} />
      <label className="block text-sm font-medium">
        {outcome === "completed"
          ? "What happened, and what did you learn?"
          : outcome === "blocked"
            ? "What got in the way, and what should change?"
            : "Why are you skipping this task? (optional)"}
        <textarea
          name="note"
          autoFocus
          required={outcome !== "skipped"}
          minLength={outcome === "skipped" ? undefined : 10}
          maxLength={2000}
          rows={4}
          placeholder={
            outcome === "completed"
              ? "I contacted five people. Two replied, and both cared more about price than the feature..."
              : outcome === "blocked"
                ? "I ran out of time because the task needed information I did not have..."
                : "This no longer feels useful, or another step makes more sense..."
          }
          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-line bg-surface p-3.5 text-sm leading-6 placeholder:text-zinc-500"
        />
        <span className="mt-2 block text-xs leading-5 text-muted">
          Your coach uses this to keep, revise, or replace the next tasks.
        </span>
      </label>
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      <div className="mt-3 flex gap-2">
        <SubmitButton pendingLabel="Adjusting plan...">
          {outcome === "skipped" ? "Skip and continue" : "Save check-in"}
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOutcome(null)}
          className={clsx(
            "focus-ring rounded-full px-4 text-sm font-semibold text-muted",
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
