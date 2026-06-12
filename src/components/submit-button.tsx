"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  pendingLabel = "Working...",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-65",
        className,
      )}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
