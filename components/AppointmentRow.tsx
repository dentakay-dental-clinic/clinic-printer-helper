"use client";

import { Appointment } from "@/types/appointment";
import { StatusBadge } from "./StatusBadge";
import { cn, formatTime, formatDuration } from "@/lib/utils";
import { Printer, User } from "lucide-react";

interface AppointmentRowProps {
  appointment: Appointment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPrint: () => void;
}

export function AppointmentRow({
  appointment: a,
  isSelected,
  onToggleSelect,
  onPrint,
}: AppointmentRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100 dark:border-slate-800 transition-colors",
        isSelected
          ? "bg-indigo-50 dark:bg-indigo-950/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label={`Select ${a.patient_name}`}
        />
      </td>

      {/* Time */}
      <td className="px-4 py-3 whitespace-nowrap w-24">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {formatTime(a.start_date_ms)}
        </span>
        <span className="block text-xs text-slate-400 mt-0.5">
          {formatDuration(a.duration_as_minute)}
        </span>
      </td>

      {/* Patient */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <User size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
              {a.patient_name}
            </p>
            <p className="text-xs text-slate-400 font-mono">{a.patient_ak}</p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {a.type_name}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={a.status_name} />
      </td>

      {/* Print action */}
      <td className="px-4 py-3 text-right w-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrint();
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            "bg-indigo-600 text-white hover:bg-indigo-700 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          )}
          aria-label={`Print ${a.patient_name}`}
        >
          <Printer size={12} />
          Print
        </button>
      </td>
    </tr>
  );
}
