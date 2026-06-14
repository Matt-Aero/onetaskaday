import { ListTree, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { signoutAction } from "@/app/actions";
import { Brand } from "@/components/brand";
import type { User } from "@/lib/db";

export function SignedInHeader({
  user,
  homeHref = "/today",
  maxWidth = "max-w-5xl",
}: {
  user: User;
  homeHref?: string;
  maxWidth?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
}) {
  return (
    <nav
      className={`mx-auto flex ${maxWidth} items-center justify-between px-5 py-6 sm:px-6`}
    >
      <Brand href={homeHref} />
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-muted sm:inline">
          Hi, {user.name.split(" ")[0]}
        </span>
        <Link
          href="/history"
          aria-label="View task trees"
          className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink"
        >
          <ListTree className="size-4" />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink"
        >
          <Settings className="size-4" />
        </Link>
        <form action={signoutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </nav>
  );
}
