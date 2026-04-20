"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { Appointment, AppointmentQueryParams } from "@/types/appointment";
import { createClientFromConfig } from "@/services/api";
import {
  fetchAppointments,
  formatApiDate,
} from "@/services/appointmentsApi";
import { enrichAppointmentsWithDemographics } from "@/services/patientsApi";
import { useClinicConfig } from "./ClinicConfigContext";

type QuickFilter = "today" | "next1h" | "next2h" | "all" | "completed" | "in_treatment" | "arrived";

interface AppointmentsContextValue {
  appointments: Appointment[];
  filtered: Appointment[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickFilter: QuickFilter;
  setQuickFilter: (f: QuickFilter) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;
  refresh: () => void;
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;
}

const AppointmentsContext = createContext<AppointmentsContextValue | null>(null);

function applyQuickFilter(appointments: Appointment[], filter: QuickFilter): Appointment[] {
  const now = new Date();
  if (filter === "today") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return appointments.filter((a) => {
      const t = new Date(a.start_date_ms).getTime();
      return t >= startOfDay.getTime() && t <= endOfDay.getTime();
    });
  }
  if (filter === "next1h") {
    const limit = now.getTime() + 60 * 60 * 1000;
    return appointments.filter((a) => {
      const t = new Date(a.start_date_ms).getTime();
      return t >= now.getTime() && t <= limit;
    });
  }
  if (filter === "next2h") {
    const limit = now.getTime() + 2 * 60 * 60 * 1000;
    return appointments.filter((a) => {
      const t = new Date(a.start_date_ms).getTime();
      return t >= now.getTime() && t <= limit;
    });
  }
  if (filter === "completed") {
    return appointments.filter((a) => a.status_name?.toUpperCase() === "COMPLETED");
  }
  if (filter === "in_treatment") {
    return appointments.filter((a) => a.status_name?.toUpperCase() === "IN_TREATMENT" || a.status_name?.toUpperCase() === "IN TREATMENT");
  }
  if (filter === "arrived") {
    return appointments.filter((a) => a.status_name?.toUpperCase() === "ARRIVED");
  }
  return appointments; // "all"
}

function applySearch(appointments: Appointment[], query: string): Appointment[] {
  if (!query.trim()) return appointments;
  const q = query.trim().toLowerCase();
  return appointments.filter(
    (a) =>
      (a.patient_ak?.toLowerCase() || "").includes(q) ||
      (a.patient_name?.toLowerCase() || "").includes(q)
  );
}

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const { config } = useClinicConfig();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayNext  = new Date(todayStart); todayNext.setDate(todayNext.getDate() + 1);
  const [dateRange, setDateRange] = useState({ start: todayStart, end: todayNext });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!config) return;
    const client = createClientFromConfig(config);
    const params: AppointmentQueryParams = {
      clinic_id: config.clinic_id,
      start_date: formatApiDate(dateRange.start),
      end_date: formatApiDate(dateRange.end),
      live: true,
    };

    setIsLoading(true);
    setError(null);

    fetchAppointments(client, params)
      .then((data) => enrichAppointmentsWithDemographics(client, data))
      .then((data) => {
        setAppointments(data);
        setSelectedIds(new Set());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load appointments");
      })
      .finally(() => setIsLoading(false));
  }, [config, dateRange, refreshToken]);

  const filtered = useMemo(() => {
    let result = applyQuickFilter(appointments, quickFilter);
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status_name === statusFilter);
    }
    return applySearch(result, searchQuery);
  }, [appointments, quickFilter, statusFilter, searchQuery]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((a) => a.appointment_id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: number) => selectedIds.has(id),
    [selectedIds]
  );

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        filtered,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        quickFilter,
        setQuickFilter,
        statusFilter,
        setStatusFilter,
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        isSelected,
        refresh,
        dateRange,
        setDateRange,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointments must be used within AppointmentsProvider");
  return ctx;
}
