"use client";

import { Appointment } from "@/types/appointment";
import { LabelPreview } from "./LabelPreview";
import { cn } from "@/lib/utils";
import { Printer, X, Users, Minus, Plus } from "lucide-react";

interface BulkPrintModalProps {
  appointments: Appointment[];
  quantity: number;
  onQuantityChange: (q: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void;
  isPrinting?: boolean;
  progress?: { current: number; total: number };
}

export function BulkPrintModal({
  appointments,
  quantity,
  onQuantityChange,
  onConfirm,
  onClose,
  onCancel,
  isPrinting = false,
  progress,
}: BulkPrintModalProps) {
  const totalLabels = appointments.length * quantity;
  const preview = appointments[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isPrinting ? onClose : undefined} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col sm:flex-row">
        
        {/* Left panel */}
        <div className="sm:w-[55%] p-5 space-y-4 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Bulk Print</h2>
            </div>
            <button onClick={!isPrinting ? onClose : undefined} disabled={isPrinting} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40">
              <X size={18} />
            </button>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { num: appointments.length, label: "Patients" },
              { num: quantity, label: "Labels each" },
              { num: totalLabels, label: "Total labels" },
            ].map(({ num, label }, i) => (
              <div key={i} className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 py-3">
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{num}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Patient list */}
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-44 overflow-y-auto">
            {appointments.map((a) => (
              <div key={a.appointment_id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.patient_name}</p>
                  <p className="text-xs font-mono text-slate-400">{a.patient_ak}</p>
                </div>
                <span className="text-xs text-slate-400">{quantity}×</span>
              </div>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Labels per patient</p>
            <div className="flex items-center gap-3">
              <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))} disabled={quantity <= 1 || isPrinting}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                <Minus size={14} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity === 0 ? "" : quantity}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") onQuantityChange(0);
                  else onQuantityChange(Math.min(99, parseInt(raw, 10)));
                }}
                onBlur={() => {
                  if (quantity < 1) onQuantityChange(1);
                }}
                disabled={isPrinting}
                className="text-2xl font-bold text-slate-900 dark:text-slate-100 w-16 text-center tabular-nums bg-transparent border-none outline-none focus:ring-0 p-0 m-0 focus:outline-none"
              />
              <button onClick={() => onQuantityChange(Math.min(99, quantity + 1))} disabled={quantity >= 99 || isPrinting}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {isPrinting && progress && (
            <div className="space-y-1">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {progress.current} of {progress.total} patients sent to printer
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={isPrinting ? onCancel : onClose}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {isPrinting ? "Stop" : "Cancel"}
            </button>
            <button onClick={onConfirm} disabled={isPrinting}
              className={cn(
                "flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white",
                "hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              )}>
              <Printer size={14} />
              {isPrinting && progress
                ? `${progress.current} / ${progress.total} patients…`
                : isPrinting ? "Printing…"
                : `Print ${totalLabels} labels`}
            </button>
          </div>
        </div>

        {/* Right panel — Label preview */}
        <div className="sm:w-[45%] bg-slate-100 dark:bg-slate-800/50 p-5 flex flex-col">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Label preview</p>
          {preview ? (
            <>
              <div className="flex-1 flex items-start justify-center">
                <LabelPreview appointment={preview} />
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">Showing first patient</p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No patients selected</div>
          )}
        </div>
      </div>
    </div>
  );
}
