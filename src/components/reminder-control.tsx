"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { updateReminderAction } from "@/app/actions";

type ReminderInterval = "hour" | "day" | "week";

const intervalMs: Record<ReminderInterval, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export function ReminderControl({
  planId,
  taskId,
  taskTitle,
  interval,
}: {
  planId: string;
  taskId: string;
  taskTitle: string;
  interval: ReminderInterval;
}) {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPermission(
        "Notification" in window ? Notification.permission : "unsupported",
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    const storageKey = `one-reminder:${planId}:${taskId}:${interval}`;
    const existing = Number(localStorage.getItem(storageKey));
    const dueAt = existing || Date.now() + intervalMs[interval];
    localStorage.setItem(storageKey, String(dueAt));

    const timeout = window.setTimeout(
      () => {
        new Notification("Your next move is ready", {
          body: taskTitle,
        });
        localStorage.removeItem(storageKey);
      },
      Math.max(dueAt - Date.now(), 0),
    );

    return () => window.clearTimeout(timeout);
  }, [interval, permission, planId, taskId, taskTitle]);

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-accent" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Reminder
        </p>
      </div>
      <form action={updateReminderAction} className="mt-3 flex gap-2">
        <input type="hidden" name="planId" value={planId} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Reminder interval</span>
          <select
            name="reminderInterval"
            defaultValue={interval}
            className="focus-ring w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="hour">In 1 hour</option>
            <option value="day">In 1 day</option>
            <option value="week">In 1 week</option>
          </select>
        </label>
        <button
          type="submit"
          className="focus-ring rounded-xl border border-line bg-white px-3 text-sm font-semibold"
        >
          Save
        </button>
      </form>
      {permission === "default" && (
        <button
          type="button"
          onClick={requestNotifications}
          className="focus-ring mt-3 text-xs font-semibold text-ink underline decoration-line underline-offset-4"
        >
          Enable browser notifications
        </button>
      )}
      <p className="mt-2 text-xs leading-5 text-muted">
        {permission === "granted"
          ? "Browser reminders are enabled while One is open."
          : permission === "denied"
            ? "Notifications are blocked in your browser settings."
            : permission === "unsupported"
              ? "This browser does not support notifications."
              : "Choose an interval and enable notifications when ready."}
      </p>
    </div>
  );
}
