"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, UserSearch, AlertCircle, Loader2 } from "lucide-react";
import { ApiClient } from "@/services/api";
import { fetchPatientByAk, patientMSInfoToAppointment } from "@/services/patientsApi";
import { Appointment } from "@/types/appointment";
import { cn } from "@/lib/utils";

interface FindPatientModalProps {
  client: ApiClient;
  onFound: (appointment: Appointment) => void;
  onClose: () => void;
  /** Pre-fill the AK field (e.g. from the search bar) */
  initialAk?: string;
}

type Status = "idle" | "loading" | "not_found" | "error";

export function FindPatientModal({ client, onFound, onClose, initialAk = "" }: FindPatientModalProps) {
  const [ak, setAk] = useState(initialAk);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSearch = useCallback(async () => {
    const trimmed = ak.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const info = await fetchPatientByAk(client, trimmed);
      if (!info) {
        setStatus("not_found");
        return;
      }
      const appt = patientMSInfoToAppointment(info);
      onFound(appt);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error");
    }
  }, [ak, client, onFound]);

  // Auto-search on mount if we already have an AK
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (initialAk.trim() && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      handleSearch();
    }
  }, [initialAk, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={status !== "loading" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <UserSearch size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                Find Patient by AK
              </h2>
              <p className="text-xs text-slate-400">
                Search without appointment
              </p>
            </div>
          </div>
          <button
            onClick={status !== "loading" ? onClose : undefined}
            disabled={status === "loading"}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the patient&apos;s AK number to retrieve their information directly
            from MedicaSimple.
          </p>

          {/* AK input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              AK Number
            </label>
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={ak}
                onChange={(e) => {
                  setAk(e.target.value);
                  setStatus("idle");
                }}
                onKeyDown={handleKeyDown}
                placeholder="AK-1234567 or 1234567"
                disabled={status === "loading"}
                className={cn(
                  "w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm font-mono",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  status === "not_found"
                    ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10"
                    : status === "error"
                    ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
                  "text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                )}
              />
              {ak && status !== "loading" && (
                <button
                  onClick={() => { setAk(""); setStatus("idle"); inputRef.current?.focus(); }}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                  aria-label="Clear"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Status messages */}
          {status === "not_found" && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle size={14} className="shrink-0" />
              <span>No patient found for <strong className="font-mono">{ak.trim()}</strong>. Check the AK and try again.</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg || "Something went wrong. Check your connection."}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={status === "loading"}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            disabled={!ak.trim() || status === "loading"}
            className={cn(
              "flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white",
              "hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {status === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search size={14} />
                Find Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
