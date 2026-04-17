import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merger — use instead of raw clsx for safety with Tailwind v4 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO date string to a readable time like "14:30" */
export function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/** Format ISO date string to DD/MM/YYYY */
export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("tr-TR");
  } catch {
    return isoString;
  }
}

/** Format date string (YYYY-MM-DD or ISO) to DD-MM-YYYY for labels */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    // If it's already in DD-MM-YYYY format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // If it's in YYYY-MM-DD format, split and reorder
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Fallback for full ISO strings or other formats
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/** Duration in minutes → human-readable like "1h 30m" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
