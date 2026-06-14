"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteAccountForm() {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <button
        type="button"
        onClick={() => setConfirmed(true)}
        className="focus-ring rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700"
      >
        Delete account
      </button>
    );
  }

  return (
    <form action={deleteAccountAction} className="rounded-2xl bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">Delete everything?</p>
      <p className="mt-1 text-sm leading-6 text-red-800">
        This permanently removes your account, task trees, and check-in history.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton
          className="bg-red-700 hover:bg-red-800"
          pendingLabel="Deleting..."
        >
          Permanently delete
        </SubmitButton>
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="focus-ring rounded-full px-4 text-sm font-semibold text-red-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
