"use client";

import { useState } from "react";
import { deleteTreeAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteTreeForm({ planId }: { planId: string }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <button
        type="button"
        onClick={() => setConfirmed(true)}
        className="focus-ring text-sm font-semibold text-red-700 underline decoration-red-200 underline-offset-4"
      >
        Delete tree
      </button>
    );
  }

  return (
    <form action={deleteTreeAction} className="rounded-2xl bg-red-50 p-4">
      <input type="hidden" name="planId" value={planId} />
      <p className="text-sm font-semibold text-red-900">Delete this task tree?</p>
      <p className="mt-1 text-sm leading-6 text-red-800">
        Its tasks and check-in history will be permanently removed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SubmitButton
          className="h-10 bg-red-700 hover:bg-red-800"
          pendingLabel="Deleting..."
        >
          Delete tree
        </SubmitButton>
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="focus-ring rounded-full px-3 text-sm font-semibold text-red-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
