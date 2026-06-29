import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { SignedInHeader } from "@/components/signed-in-header";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen overflow-hidden">
      {user ? (
        <SignedInHeader user={user} maxWidth="max-w-6xl" />
      ) : (
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Brand />
          <div className="flex items-center gap-3">
            <>
              <Link
                href="/signin"
                className="focus-ring rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="focus-ring rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
              >
                Sign up
              </Link>
            </>
          </div>
        </nav>
      )}

      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[1.08fr_.92fr] lg:pt-4">
        <div className="fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-sm">
            <Sparkles className="size-3.5 text-accent" />
            Less planning. More progress.
          </div>
          <h1 className="max-w-3xl text-[clamp(3.4rem,8vw,6.8rem)] font-semibold leading-[0.9] tracking-[-0.075em]">
            Know what to do{" "}
            <span className="text-accent">next.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Tell One where you want to go. Get a single, realistic action for
            now. Check in when you are ready, and the next task adapts.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? "/today" : "/signup"}
              className="focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-white transition hover:bg-black"
            >
              Choose my next step
              <ArrowRight className="size-4" />
            </Link>
            <span className="flex items-center justify-center gap-2 px-4 text-sm text-muted">
              <Check className="size-4" />
              Free to start
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md fade-up [animation-delay:120ms]">
          <div className="soft-shadow rotate-[-1.5deg] rounded-[1.75rem] border border-line bg-surface p-7 sm:p-9">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Next
                </p>
                <p className="mt-2 text-sm text-muted">20 minutes</p>
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-paper text-xs font-semibold">
                1/3
              </span>
            </div>
            <h2 className="mt-14 text-3xl font-semibold leading-tight tracking-[-0.045em]">
              Ask one person about the work they actually enjoy.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-muted">
              Send a short message to someone whose career you respect. Ask for
              fifteen minutes and one honest answer.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
                <Check className="size-5" />
              </span>
              <span className="text-sm font-semibold">Mark complete</span>
            </div>
          </div>
          <div className="soft-shadow absolute -bottom-10 -right-5 -z-10 h-44 w-[88%] rotate-[3deg] rounded-[1.75rem] border border-line bg-[#ddd7cb]" />
        </div>
      </section>
    </main>
  );
}
