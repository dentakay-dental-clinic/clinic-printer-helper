import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_PRINTER_SETTINGS, PrinterSettings } from "@/types/config";
import { IPrinterService, PrintJob, PrintResult } from "./PrinterService";

/**
 * ArgoxPrinterService — sends labels through the native OS print path
 * (Windows GDI or macOS CUPS, no browser print dialog).
 *
 * Requires:
 *   1. Printer driver installed
 *   2. printerName set to the exact OS queue name
 *   3. Running inside the Tauri desktop app (not the browser dev server)
 */
export class ArgoxPrinterService implements IPrinterService {
  constructor(
    private printerName: string,
    private printerSettings: PrinterSettings = DEFAULT_PRINTER_SETTINGS,
  ) {}

  isReady(): boolean {
    return !!this.printerName;
  }

  getStatus(): string {
    return this.printerName ? `Label printer: ${this.printerName}` : "No printer configured";
  }

  async print(job: PrintJob): Promise<PrintResult> {
    const jobId = `argox-${Date.now()}`;
    try {
      const msg = await invoke<string>("print_labels", {
        printerName: this.printerName,
        patients: job.patients,
        quantity: job.quantity,
        labelWidthMm:
          this.printerSettings.label_width_mm ??
          DEFAULT_PRINTER_SETTINGS.label_width_mm,
        labelHeightMm:
          this.printerSettings.label_height_mm ??
          DEFAULT_PRINTER_SETTINGS.label_height_mm,
        labelTopOffsetMm:
          this.printerSettings.label_top_offset_mm ??
          DEFAULT_PRINTER_SETTINGS.label_top_offset_mm,
      });
      return { success: true, message: msg, jobId };
    } catch (err) {
      return { success: false, message: String(err), jobId };
    }
  }
}

/** Returns the list of OS printer names. Empty array outside Tauri. */
export async function listPrinters(): Promise<string[]> {
  try {
    return await invoke<string[]>("list_printers");
  } catch {
    return [];
  }
}

/** Runs a diagnostic check on the named printer. Returns a human-readable status string. */
export async function testPrinter(printerName: string): Promise<string> {
  try {
    return await invoke<string>("test_printer", { printerName });
  } catch (err) {
    return `❌ invoke failed: ${String(err)}`;
  }
}

/** True when running inside the Tauri desktop app. */
export function isTauriApp(): boolean {
  try {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  } catch {
    return false;
  }
}

/** True when running on Windows (works inside Tauri and browser). */
export function isWindows(): boolean {
  return typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);
}
