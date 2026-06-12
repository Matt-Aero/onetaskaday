"use client";

import { Check, X } from "lucide-react";
import { useActionState, useState } from "react";
import { checkinAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { clsx } from "clsx";

const initialState: FormState = {};

export function Checkin({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(checkinAction, initialState);
  const [outcome, setOutcome] = useState<"completed" | "blocked" | null>(null);

  if (!outcome) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-3">
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
          className="focus-ring flex h-13 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-semibold transition hover:border-zinc-300"
        >
          <X className="size-4" />
          I got stuck
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
          : "What got in the way, and what should change?"}
        <textarea
          name="note"
          autoFocus
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder={
            outcome === "completed"
              ? "I contacted five people. Two replied, and both cared more about price than the feature..."
              : "I ran out of time because the task needed information I did not have..."
          }
          className="focus-ring mt-2 w-full resize-none rounded-2xl border border-line bg-white p-3.5 text-sm leading-6 placeholder:text-zinc-400"
        />
        <span className="mt-2 block text-xs leading-5 text-muted">
          Your coach uses this to keep, revise, or replace the next three tasks.
        </span>
      </label>
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      <div className="mt-3 flex gap-2">
        <SubmitButton pendingLabel="Adjusting plan...">
          Save check-in
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
