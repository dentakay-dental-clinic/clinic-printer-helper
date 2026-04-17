"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppointmentsProvider, useAppointments } from "@/contexts/AppointmentsContext";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { AppointmentRow } from "@/components/AppointmentRow";
import { SearchInput } from "@/components/SearchInput";
import { QuickFilters } from "@/components/QuickFilters";
import { StatusFilter } from "@/components/StatusFilter";
import { BulkActionBar } from "@/components/BulkActionBar";
import { PrintModal } from "@/components/PrintModal";
import { BulkPrintModal } from "@/components/BulkPrintModal";
import { printerService as webPrinterService } from "@/services/WebPrinterService";
import { ArgoxPrinterService, isTauriApp } from "@/services/ArgoxPrinterService";
import { IPrinterService } from "@/services/PrinterService";
import { printHistoryStore } from "@/store/PrintHistoryStore";
import { PrintHistoryPanel } from "@/components/PrintHistoryPanel";
import { createClientFromConfig } from "@/services/api";
import { fetchPatientByAk, patientMSInfoToAppointment } from "@/services/patientsApi";
import { Appointment } from "@/types/appointment";
import { cn, formatDisplayDate } from "@/lib/utils";
import { RefreshCw, Settings, Printer, CheckSquare, AlertCircle, ChevronLeft, ChevronRight, History, UserSearch, Search, X, Loader2 } from "lucide-react";

const PAGE_SIZE = 5;

export default function AppointmentsPage() {
  return (
    <AppointmentsProvider>
      <AppointmentsPageInner />
    </AppointmentsProvider>
  );
}

function AppointmentsPageInner() {
  const router = useRouter();
  const { config } = useClinicConfig();
  const {
    filtered, isLoading, error,
    searchQuery, setSearchQuery,
    quickFilter, setQuickFilter,
    selectedIds, toggleSelect, selectAll, clearSelection, isSelected,
    refresh, dateRange, setDateRange,
  } = useAppointments();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Ensure the input is immediately ready to type when app opens
    searchInputRef.current?.focus();
    // A tiny timeout helps if there are any immediate modal/layout shifts
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Use Argox native printing inside Tauri; fall back to window.print() in browser
  const printerService = useMemo<IPrinterService>(() => {
    if (isTauriApp() && config?.printer_name) {
      return new ArgoxPrinterService(config.printer_name);
    }
    return webPrinterService;
  }, [config?.printer_name]);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset to page 1 when filter/search changes
  const handleSearch = useCallback((q: string) => { setSearchQuery(q); setPage(1); }, [setSearchQuery]);
  const handleFilter = useCallback((f: Parameters<typeof setQuickFilter>[0]) => { setQuickFilter(f); setPage(1); }, [setQuickFilter]);

  // Day selector: -1 = yesterday, 0 = today, 1 = tomorrow
  const dayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const diff = Math.round((start.getTime() - today.getTime()) / 86_400_000);
    return Math.max(-1, Math.min(1, diff));
  }, [dateRange]);

  const setDay = useCallback((offset: number) => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + offset);
    const end   = new Date(start); end.setDate(end.getDate() + 1);
    setDateRange({ start, end });
    setPage(1);
  }, [setDateRange, setPage]);

  // Modals
  const [printTarget, setPrintTarget] = useState<Appointment | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState(() => config?.default_quantity ?? 7);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [bulkCancelled, setBulkCancelled] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // API client for on-demand patient lookup (shares same config as appointments)
  const apiClient = useMemo(() => config ? createClientFromConfig(config) : null, [config]);

  const handleLiveSearch = async (ak: string) => {
    if (!apiClient) return;
    const trimmed = ak.trim();
    if (!trimmed) return;

    setIsSearchingLive(true);
    try {
      const info = await fetchPatientByAk(apiClient, trimmed);
      if (!info) {
        showToast(`No patient found for ${trimmed}`, false);
        return;
      }
      const appt = patientMSInfoToAppointment(info);
      setPrintTarget(appt);
    } catch (err: any) {
      showToast(err.message || "Failed to search patient", false);
    } finally {
      setIsSearchingLive(false);
    }
  };

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const handleSinglePrint = useCallback(async (quantity: number) => {
    if (!printTarget) return;
    setIsPrinting(true);
    try {
      // Format the date before sending to the printer service
      const patientToPrint = {
        ...printTarget,
        patient_birth_date: formatDisplayDate(printTarget.patient_birth_date),
      };
      const r = await printerService.print({ patients: [patientToPrint], quantity });
      printHistoryStore.add({
        timestamp: Date.now(),
        patientName: printTarget.patient_name,
        patientAk: printTarget.patient_ak,
        quantity,
        success: r.success,
      });
      showToast(r.message, r.success);
    } catch { showToast("Print failed. Check printer.", false); }
    finally { setIsPrinting(false); setPrintTarget(null); }
  }, [printTarget, printerService]);

  const handleBulkPrint = useCallback(async () => {
    const patients = filtered.filter((a) => selectedIds.has(a.appointment_id));
    setIsPrinting(true);
    setBulkCancelled(false);
    setBulkProgress({ current: 0, total: patients.length });
    let successCount = 0;
    try {
      for (let i = 0; i < patients.length; i++) {
        if (bulkCancelled) break;
        setBulkProgress({ current: i + 1, total: patients.length });
        
        // Format the date for each patient
        const patientToPrint = {
          ...patients[i],
          patient_birth_date: formatDisplayDate(patients[i].patient_birth_date),
        };
        
        const r = await printerService.print({ patients: [patientToPrint], quantity: bulkQuantity });
        printHistoryStore.add({
          timestamp: Date.now(),
          patientName: patients[i].patient_name,
          patientAk: patients[i].patient_ak,
          quantity: bulkQuantity,
          success: r.success,
        });
        if (r.success) successCount++;
      }
      const attempted = Math.min(patients.length, bulkProgress?.current ?? patients.length);
      showToast(`Printed ${successCount} / ${attempted} patients.`, successCount === attempted && !bulkCancelled);
      clearSelection();
    } catch { showToast("Bulk print failed. Check printer.", false); }
    finally { setIsPrinting(false); setBulkProgress(undefined); setBulkCancelled(false); setShowBulkModal(false); }
  }, [filtered, selectedIds, bulkQuantity, bulkCancelled, clearSelection, printerService]);

  const allPageSelected = paginated.length > 0 && paginated.every((a) => selectedIds.has(a.appointment_id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Printer size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {config?.clinic_name || "Clinic"}
              </h1>
              <p className="text-[10px] text-slate-400">ID #{config?.clinic_id}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium mr-1",
              isTauriApp() && config?.printer_name
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isTauriApp() && config?.printer_name ? "bg-green-500 animate-pulse" : "bg-amber-500"
              )} />
              {printerService.getStatus()}
            </div>
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <History size={13} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button onClick={refresh} disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => router.push("/settings")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Settings size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <main className="flex-1 bg-[#f0f0f0] dark:bg-slate-950 flex flex-col items-center justify-center px-6 py-10 gap-3">
        <div className="w-full max-w-2xl flex flex-col gap-3">

          {/* Search card */}
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-indigo-500/5 px-5 py-4 flex items-center gap-4 border-2 border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-200 cursor-text" 
            onClick={() => searchInputRef.current?.focus()}
          >
            <Search size={22} className="text-indigo-500 shrink-0" strokeWidth={2.5} />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by patient name or AK number…"
              className="flex-1 min-w-0 bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-lg leading-relaxed outline-none border-none focus:ring-0 focus:outline-none p-0 m-0 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="shrink-0 h-6 w-6 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus:outline-none"
              >
                <X size={14} strokeWidth={2.5} className="text-slate-500 dark:text-slate-400" />
              </button>
            )}
          </div>

          {/* Results card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md overflow-hidden">

            {/* Label row */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              
              {/* Day + filter pills */}
              <div className="flex items-center justify-between w-full flex-wrap">
                <div className="flex rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                  {([-1, 0, 1] as const).map((offset) => (
                    <button
                      key={offset}
                      onClick={() => setDay(offset)}
                      className={cn(
                        "px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                        offset !== 1 && "border-r border-slate-200 dark:border-slate-700",
                        dayOffset === offset
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {offset === -1 ? "Yest." : offset === 0 ? "Today" : "Tmrw."}
                    </button>
                  ))}
                </div>
                <QuickFilters active={quickFilter} onChange={handleFilter} />
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600 dark:border-indigo-900/30 dark:border-t-indigo-500" />
                <span className="text-xs font-medium">Checking appointments…</span>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                searchQuery={searchQuery}
                onSearchLive={apiClient ? handleLiveSearch : undefined}
                isSearchingLive={isSearchingLive}
              />
            ) : (
              <>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((appt) => (
                    <PatientRow
                      key={appt.appointment_id}
                      appointment={appt}
                      isSelected={isSelected(appt.appointment_id)}
                      onToggleSelect={() => toggleSelect(appt.appointment_id)}
                      onPrint={() => setPrintTarget(appt)}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-xs text-slate-400 tabular-nums">{currentPage} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-600">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      {printTarget && (
        <PrintModal
          appointment={printTarget}
          defaultQuantity={config?.default_quantity ?? 7}
          onConfirm={handleSinglePrint}
          onClose={() => !isPrinting && setPrintTarget(null)}
          isPrinting={isPrinting}
        />
      )}
      {showBulkModal && (
        <BulkPrintModal
          appointments={filtered.filter((a) => selectedIds.has(a.appointment_id))}
          quantity={bulkQuantity}
          onQuantityChange={setBulkQuantity}
          onConfirm={handleBulkPrint}
          onClose={() => !isPrinting && setShowBulkModal(false)}
          onCancel={() => setBulkCancelled(true)}
          isPrinting={isPrinting}
          progress={bulkProgress}
        />
      )}
      {showHistory && <PrintHistoryPanel onClose={() => setShowHistory(false)} />}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        quantity={bulkQuantity}
        onQuantityChange={setBulkQuantity}
        onPrint={() => setShowBulkModal(true)}
        onClear={clearSelection}
        onSelectAll={selectAll}
        totalVisible={filtered.length}
      />

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in slide-in-from-top-2",
          toast.ok ? "bg-green-600" : "bg-red-600"
        )}>
          {toast.ok ? "✓" : "✕"} {toast.message}
        </div>
      )}
    </div>
  );
}

// ── Compact patient row (search result style) ────────────────────────────────

function PatientRow({
  appointment: a,
  isSelected,
  onToggleSelect,
  onPrint,
  searchQuery,
}: {
  appointment: Appointment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPrint: () => void;
  searchQuery: string;
}) {
  // Highlight matching portion of name/AK
  function highlight(text: string) {
    if (!searchQuery.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(searchQuery.trim().toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 rounded-sm px-0.5 not-italic font-inherit">
          {text.slice(idx, idx + searchQuery.trim().length)}
        </mark>
        {text.slice(idx + searchQuery.trim().length)}
      </>
    );
  }

  const timeStr = a.start_date_ms
    ? new Date(a.start_date_ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-default",
        isSelected && "bg-indigo-50/60 dark:bg-indigo-900/10"
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
      />

      {/* Time */}
      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 w-9 shrink-0 tabular-nums">
        {timeStr}
      </span>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
          {highlight(a.patient_name)}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
          {highlight(a.patient_ak ?? "")}
        </p>
      </div>

      {/* Type (hidden on small screens) */}
      {a.type_name && (
        <span className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
          {a.type_name}
        </span>
      )}

      {/* Status pill */}
      <StatusPill status={a.status_name} />

      {/* Print button */}
      <button
        onClick={onPrint}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Printer size={12} />
        Print
      </button>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const s = status ?? "";
  const map: Record<string, string> = {
    Completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    Arrived:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    Pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    Confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
    Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    Postponed: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    "In Treatment": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  };
  const cls = map[s] ?? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", cls)}>
      {s || "—"}
    </span>
  );
}

// ── Smart empty state ────────────────────────────────────────────────────────

/** Detects whether a string looks like an AK identifier (numeric or AK-/PP- prefixed). */
function looksLikeAk(q: string): boolean {
  const t = q.trim().toUpperCase();
  return /^\d{4,}$/.test(t) || /^(AK|PP)-\d+$/.test(t);
}

function EmptyState({
  searchQuery,
  onSearchLive,
  isSearchingLive,
}: {
  searchQuery: string;
  onSearchLive?: (ak: string) => void;
  isSearchingLive?: boolean;
}) {
  const hasQuery = searchQuery.trim().length > 0;
  const isAkLike = hasQuery && looksLikeAk(searchQuery);

  return (
    <div className="min-h-[200px] pt-12 py-20 px-6 flex flex-col items-center justify-center gap-6 text-slate-400">
      <Printer size={32} className="opacity-20" />

      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500">
          {hasQuery ? `No appointments match \u201c${searchQuery.trim()}\u201d` : "No appointments found"}
        </p>
        {hasQuery && !isAkLike && (
          <p className="text-xs text-slate-400">Try searching by full name or AK number</p>
        )}
      </div>

      {/* Live MS lookup CTA — shown when query looks like an AK */}
      {isAkLike && onSearchLive && (
        <div className="mt-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 flex items-center gap-3 max-w-sm">
          <UserSearch size={18} className="text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-snug">
              <strong className="font-mono">{searchQuery.trim()}</strong> has no appointment today.
            </p>
          </div>
          <button
            onClick={() => onSearchLive(searchQuery.trim())}
            disabled={isSearchingLive}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSearchingLive ? <Loader2 size={11} className="animate-spin" /> : <UserSearch size={11} />}
            {isSearchingLive ? "Searching…" : "Search live"}
          </button>
        </div>
      )}

      {/* Generic live search hint — shown when query doesn't look like an AK */}
      {hasQuery && !isAkLike && onSearchLive && (
        <button
          onClick={() => onSearchLive(searchQuery.trim())}
          className="text-xs text-indigo-500 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 transition-colors"
        >
          Search by AK in MedicaSimple instead
        </button>
      )}
    </div>
  );
}
