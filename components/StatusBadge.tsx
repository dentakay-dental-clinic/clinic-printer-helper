"use client";

import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  Pending:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Confirmed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Arrived:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "In Treatment":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Completed:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  "Not Attended":
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  "Not Reached":
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  Postponed:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Cancelled:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const DEFAULT_BADGE = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_BADGE[status] ?? DEFAULT_BADGE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {status}
    </span>
  );
}
