"use client";

import { cn } from "@/lib/utils";

type QuickFilter = "today" | "next1h" | "next2h" | "all" | "completed" | "in_treatment" | "arrived";

const FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "next1h", label: "Next 1h" },
  { key: "next2h", label: "Next 2h" },
  { key: "completed", label: "Completed" },
  { key: "in_treatment", label: "In Treatment" },
  { key: "arrived", label: "Arrived" },
];

interface QuickFiltersProps {
  active: QuickFilter;
  onChange: (filter: QuickFilter) => void;
}

export function QuickFilters({ active, onChange }: QuickFiltersProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all duration-150",
            active === key
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
