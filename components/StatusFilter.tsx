"use client";

import { useAppointments } from "@/contexts/AppointmentsContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function StatusFilter() {
  const { appointments, statusFilter, setStatusFilter } = useAppointments();

  // Calculate counts for each status
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      const s = a.status_name;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return map;
  }, [appointments]);

  // Only show statuses that actually have appointments, sorted by count descending
  const statuses = useMemo(() => {
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }));
  }, [counts]);

  if (statuses.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <button
        onClick={() => setStatusFilter("all")}
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all duration-150 border",
          statusFilter === "all"
            ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
            : "bg-transparent text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
        )}
      >
        All
      </button>
      
      {statuses.map(({ status, count }) => (
        <button
          key={status}
          onClick={() => setStatusFilter(status)}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all duration-150 border",
            statusFilter === status
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800/60 dark:text-indigo-300"
              : "bg-transparent border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50"
          )}
        >
          {status}
          <span className={cn(
            "rounded-full px-1 text-[10px] font-bold",
            statusFilter === status
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          )}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}
