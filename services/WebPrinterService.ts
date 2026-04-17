import { IPrinterService, PrintJob, PrintResult } from "./PrinterService";
import { formatDisplayDate } from "@/lib/utils";

/**
 * WebPrinterService — production printer using window.print().
 *
 * Injects label HTML into the hidden #print-area div in the DOM,
 * triggers the OS print dialog, then cleans up.
 *
 * Works with any Windows driver-based printer (e.g. Argox OS-214plus).
 * The @page size in globals.css must match the physical label dimensions.
 */
export class WebPrinterService implements IPrinterService {
  isReady(): boolean {
    return typeof window !== "undefined";
  }

  getStatus(): string {
    return "Printer ready";
  }

  async print(job: PrintJob): Promise<PrintResult> {
    const jobId = `print-${Date.now()}`;

    const printArea = document.getElementById("print-area");
    if (!printArea) {
      return { success: false, message: "Print area not found in DOM.", jobId };
    }

    // Build one label block per patient × quantity
    const labelsHtml = job.patients
      .flatMap((p) =>
        Array.from({ length: job.quantity }, () => buildLabelHtml(p.patient_name, p.patient_birth_date ?? undefined, p.patient_gender ?? undefined, p.patient_ak))
      )
      // page-break-after: always on all except the very last label
      .map((html, i, arr) =>
        i < arr.length - 1
          ? html.replace('class="label-page"', 'class="label-page label-break"')
          : html
      )
      .join("");

    printArea.innerHTML = labelsHtml;

    // Let the browser render the injected HTML before printing
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    window.print();

    // Clean up after dialog closes (synchronous in most browsers)
    printArea.innerHTML = "";

    return {
      success: true,
      message: `Sent ${job.patients.length} patient(s) × ${job.quantity} label(s) to printer.`,
      jobId,
    };
  }
}

function buildLabelHtml(
  name: string | undefined,
  birthDate: string | undefined,
  gender: string | undefined,
  ak: string | undefined
): string {
  const safe = (v: string | undefined) =>
    (v || "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const dimIfMissing = (v: string | undefined) => (!v ? ' style="opacity:0.45"' : "");

  return `<div class="label-page">
  <div class="label-header">Dentakay Dental Clinic</div>
  <div class="label-body">
    <p><span class="lbl">Hasta Adı Soyadı:</span><span>${safe(name)}</span></p>
    <p${dimIfMissing(birthDate)}><span class="lbl">Doğum Tarihi:</span><span>${safe(formatDisplayDate(birthDate))}</span></p>
    <p${dimIfMissing(gender)}><span class="lbl">Cinsiyet:</span><span>${safe(gender)}</span></p>
    <p><span class="lbl">Ak Kodu:</span><b>${safe(ak)}</b></p>
  </div>
</div>`;
}

/** Singleton — import this everywhere instead of MockPrinterService */
export const printerService: IPrinterService = new WebPrinterService();
