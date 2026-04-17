"use client";

import { useState } from "react";
import { Appointment } from "@/types/appointment";
import { LabelPreview } from "./LabelPreview";
import { StatusBadge } from "./StatusBadge";
import { formatTime, formatDate, cn } from "@/lib/utils";
import { Printer, X, Clock, Tag, Minus, Plus } from "lucide-react";

interface PrintModalProps {
  appointment: Appointment;
  defaultQuantity: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
  isPrinting?: boolean;
}

export function PrintModal({
  appointment: a,
  defaultQuantity,
  onConfirm,
  onClose,
  isPrinting = false,
}: PrintModalProps) {
  const [quantity, setQuantity] = useState(defaultQuantity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isPrinting ? onClose : undefined} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col sm:flex-row">
        
        {/* Left panel — Patient info */}
        <div className="sm:w-[55%] p-5 space-y-4 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Print Label</h2>
            <button onClick={!isPrinting ? onClose : undefined} disabled={isPrinting} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40">
              <X size={18} />
            </button>
          </div>

          {/* Patient */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{a.patient_name}</p>
            <p className="text-xs font-mono text-indigo-500 dark:text-indigo-400">{a.patient_ak}</p>
            <div className="pt-1"><StatusBadge status={a.status_name} /></div>
          </div>

          {/* Appointment details */}
          <div className="space-y-2">
            <Row icon={<Clock size={13} />} label="Appointment" value={`${formatDate(a.start_date_ms)} · ${formatTime(a.start_date_ms)}`} />
            <Row icon={<Tag size={13} />} label="Type" value={a.type_name} />
            {a.notes && <Row icon={<span>📝</span>} label="Notes" value={a.notes} />}
          </div>

          {/* Quantity control */}
          <div className="pt-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Number of labels</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isPrinting}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              ><Minus size={14} /></button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity === 0 ? "" : quantity}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") setQuantity(0);
                  else setQuantity(Math.min(99, parseInt(raw, 10)));
                }}
                onBlur={() => {
                  if (quantity < 1) setQuantity(1);
                }}
                disabled={isPrinting}
                className="text-2xl font-bold text-slate-900 dark:text-slate-100 w-16 text-center tabular-nums bg-transparent border-none outline-none focus:ring-0 p-0 m-0 focus:outline-none"
              />
              <button
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99 || isPrinting}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              ><Plus size={14} /></button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={!isPrinting ? onClose : undefined} disabled={isPrinting}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button onClick={() => onConfirm(quantity)} disabled={isPrinting}
              className={cn(
                "flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white",
                "hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              )}>
              <Printer size={14} />
              {isPrinting ? "Printing…" : `Print ${quantity}`}
            </button>
          </div>
        </div>

        {/* Right panel — Label preview */}
        <div className="sm:w-[45%] bg-slate-100 dark:bg-slate-800/50 p-5 flex flex-col">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Label preview</p>
          <div className="flex-1 flex items-start justify-center">
            <LabelPreview appointment={a} />
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            {quantity} label{quantity !== 1 ? "s" : ""} will print per patient
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-slate-400 shrink-0 w-20">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-medium break-words">{value}</span>
    </div>
  );
}
