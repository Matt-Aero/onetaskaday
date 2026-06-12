"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { onboardingAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { clsx } from "clsx";

const focusOptions = [
  "Work",
  "Health",
  "Relationships",
  "Confidence",
  "Money",
  "Home",
  "Learning",
  "Creativity",
];

const initialState: FormState = {};

export function OnboardingForm() {
  const [state, action] = useActionState(onboardingAction, initialState);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  function nextStep() {
    setStep((value) => Math.min(value + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form action={action}>
      <div className="mb-12 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors",
              item <= step ? "bg-ink" : "bg-line",
            )}
          />
        ))}
      </div>

      <section className={step === 1 ? "block fade-up" : "hidden"}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Start with direction
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          What would a better life feel like?
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted">
          Do not make it perfect. Give us enough context to choose a useful first
          move.
        </p>
        <Textarea
          name="futureVision"
          label="Picture yourself one year from now. What's different?"
          placeholder="I have more energy, work I care about, and I feel less stuck when making decisions..."
          minLength={20}
        />
        <fieldset className="mt-8">
          <legend className="mb-3 text-sm font-medium">
            Which areas matter most right now?
          </legend>
          <div className="flex flex-wrap gap-2">
            {focusOptions.map((option) => {
              const active = selected.includes(option);
              return (
                <label
                  key={option}
                  className={clsx(
                    "focus-ring cursor-pointer rounded-full border px-4 py-2.5 text-sm font-medium transition",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white hover:border-zinc-300",
                  )}
                >
                  <input
                    type="checkbox"
                    name="focusAreas"
                    value={option}
                    className="sr-only"
                    checked={active}
                    onChange={() =>
                      setSelected((current) =>
                        active
                          ? current.filter((item) => item !== option)
                          : [...current, option],
                      )
                    }
                  />
                  <span className="flex items-center gap-1.5">
                    {active && <Check className="size-3.5" />}
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={nextStep}
          disabled={selected.length === 0}
          className="focus-ring mt-10 h-12 rounded-full bg-ink px-7 text-sm font-semibold text-white disabled:opacity-30"
        >
          Continue
        </button>
      </section>

      <section className={step === 2 ? "block fade-up" : "hidden"}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Choose one thing
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Where should we begin?
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted">
          You can change focus later. For now, one clear priority gives the plan
          somewhere to go.
        </p>
        <Textarea
          name="primaryGoal"
          label="The problem or goal I want to focus on first"
          placeholder="I want to move into a job that is more creative without putting my finances at risk."
          minLength={10}
        />
        <Textarea
          name="motivation"
          label="Why does this matter now?"
          placeholder="I've put it off for two years and I don't want another year to look the same."
          minLength={10}
        />
        <div className="mt-10 flex gap-3">
          <BackButton onClick={() => setStep(1)} />
          <button
            type="button"
            onClick={nextStep}
            className="focus-ring h-12 rounded-full bg-ink px-7 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </section>

      <section className={step === 3 ? "block fade-up" : "hidden"}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Make it realistic
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Build around your actual day.
        </h1>
        <Textarea
          name="constraints"
          label="What could get in the way?"
          placeholder="I work long hours, have limited energy on weekdays, and tend to overthink."
          minLength={2}
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium">Time per day</span>
            <select
              name="minutesPerDay"
              defaultValue="20"
              className="focus-ring h-13 w-full rounded-2xl border border-line bg-white px-4 text-[15px]"
            >
              <option value="10">10 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium">Coaching style</span>
            <select
              name="coachingStyle"
              defaultValue="direct"
              className="focus-ring h-13 w-full rounded-2xl border border-line bg-white px-4 text-[15px]"
            >
              <option value="gentle">Gentle</option>
              <option value="direct">Direct</option>
              <option value="challenging">Challenge me</option>
            </select>
          </label>
        </div>

        {state.error && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="mt-10 flex gap-3">
          <BackButton onClick={() => setStep(2)} />
          <SubmitButton pendingLabel="Choosing your first move...">
            Build my plan
          </SubmitButton>
        </div>
        <p className="mt-5 max-w-md text-xs leading-5 text-muted">
          One is an action-planning tool, not medical or mental health care. For
          urgent or high-stakes situations, contact a qualified professional.
        </p>
      </section>
    </form>
  );
}

function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="mt-8 block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <textarea
        required
        rows={4}
        {...props}
        className="focus-ring w-full resize-none rounded-3xl border border-line bg-white p-4 text-[15px] leading-6 shadow-sm placeholder:text-zinc-400"
      />
    </label>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring h-12 rounded-full border border-line bg-white px-6 text-sm font-semibold"
    >
      Back
    </button>
  );
}
