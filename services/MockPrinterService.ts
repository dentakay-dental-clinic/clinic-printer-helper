import { IPrinterService, PrintJob, PrintResult } from "./PrinterService";

/**
 * MockPrinterService — development stand-in for the real Tauri printer.
 *
 * Simulates a successful print job with a short delay.
 * Logs full job details to the console for inspection.
 *
 * TODO: Replace with TauriPrinterService that calls:
 *   invoke('print_label', { patients, quantity })
 * when the Tauri native command is ready.
 */
export class MockPrinterService implements IPrinterService {
  private _ready = true;

  isReady(): boolean {
    return this._ready;
  }

  getStatus(): string {
    return this._ready ? "Mock printer ready" : "Mock printer offline";
  }

  async print(job: PrintJob): Promise<PrintResult> {
    const jobId = `mock-${Date.now()}`;

    console.group(`[MockPrinterService] Print Job: ${jobId}`);
    console.log("Patients:", job.patients.length);
    console.log("Quantity per patient:", job.quantity);
    console.log("Total labels:", job.patients.length * job.quantity);
    job.patients.forEach((p) => {
      console.log(
        `  • ${p.patient_name} (AK: ${p.patient_ak}) — ${job.quantity} label(s)`
      );
    });
    console.groupEnd();

    // Simulate print delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      message: `Mock print complete — ${job.patients.length} patient(s) × ${job.quantity} label(s)`,
      jobId,
    };
  }
}

/** Singleton mock printer — replace with TauriPrinterService for production */
export const printerService: IPrinterService = new MockPrinterService();
