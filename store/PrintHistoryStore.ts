const HISTORY_KEY = "print_history";
const MAX_RECORDS = 200;

export interface PrintRecord {
  id: string;
  timestamp: number;
  patientName: string;
  patientAk: string;
  quantity: number;
  success: boolean;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export const printHistoryStore = {
  getAll(): PrintRecord[] {
    try {
      return JSON.parse(storage()?.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  },

  add(record: Omit<PrintRecord, "id">): void {
    try {
      const s = storage();
      if (!s) return;
      const all = this.getAll();
      all.unshift({
        ...record,
        id: `${Date.now()}-${Math.random()}`,
        patientName: record.patientName ?? "-",
        patientAk: record.patientAk ?? "-",
      });
      s.setItem(HISTORY_KEY, JSON.stringify(all.slice(0, MAX_RECORDS)));
    } catch {}
  },

  clear(): void {
    storage()?.removeItem(HISTORY_KEY);
  },
};
