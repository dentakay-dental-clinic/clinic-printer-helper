"use client";

import { useEffect, useState } from "react";
import { printHistoryStore, PrintRecord } from "@/store/PrintHistoryStore";
import { X, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

interface PrintHistoryPanelProps {
  onClose: () => void;
}

export function PrintHistoryPanel({ onClose }: PrintHistoryPanelProps) {
  const [records, setRecords] = useState<PrintRecord[]>([]);

  useEffect(() => {
    setRecords(printHistoryStore.getAll());
  }, []);

  function handleClear() {
    if (!confirm("Clear all print history?")) return;
    printHistoryStore.clear();
    setRecords([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Print History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{records.length} record{records.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
              <Clock size={28} className="opacity-30" />
              <p className="text-sm">No prints yet</p>
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                {r.success
                  ? <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                  : <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.patientName}</p>
                  <p className="text-xs font-mono text-slate-400">{r.patientAk}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.quantity} label{r.quantity !== 1 ? "s" : ""} · {formatTime(r.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
