import { invoke } from "@tauri-apps/api/core";
import { IPrinterService, PrintJob, PrintResult } from "./PrinterService";

/**
 * ArgoxPrinterService — sends raw PPLA commands directly to the Argox OS-214plus
 * via the Windows print spooler (no dialog, no browser involved).
 *
 * Requires:
 *   1. Argox Windows driver installed ("Devices and Printers")
 *   2. printerName set to the exact name shown in Windows
 *   3. Running inside the Tauri desktop app (not the browser dev server)
 */
export class ArgoxPrinterService implements IPrinterService {
  constructor(private printerName: string) {}

  isReady(): boolean {
    return !!this.printerName;
  }

  getStatus(): string {
    return this.printerName ? `Argox: ${this.printerName}` : "No printer configured";
  }

  async print(job: PrintJob): Promise<PrintResult> {
    const jobId = `argox-${Date.now()}`;
    try {
      const msg = await invoke<string>("print_labels", {
        printerName: this.printerName,
        patients: job.patients,
        quantity: job.quantity,
      });
      return { success: true, message: msg, jobId };
    } catch (err) {
      return { success: false, message: String(err), jobId };
    }
  }
}

/** Returns the list of Windows printer names. Empty array outside Tauri. */
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
