import { Appointment } from "@/types/appointment";

export interface PrintJob {
  patients: Appointment[];
  quantity: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
  jobId: string;
}

/** A free-text label print job (not tied to a patient record). */
export interface TextPrintJob {
  /** Raw text as typed. Newlines start a new line/paragraph. */
  text: string;
  /** Number of identical labels to print. */
  quantity: number;
  /** Font size in points. Defaults to 12. */
  fontPt?: number;
  /** Horizontal alignment. Defaults to "center". */
  align?: "left" | "center";
}

export interface IPrinterService {
  print(job: PrintJob): Promise<PrintResult>;
  /** Print arbitrary free text on the same label stock. */
  printText(job: TextPrintJob): Promise<PrintResult>;
  isReady(): boolean;
  getStatus(): string;
}
