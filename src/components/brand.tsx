import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center gap-2 rounded-full text-[15px] font-semibold tracking-[-0.02em]"
    >
      <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-white">
        1
      </span>
      One
    </Link>
  );
}
