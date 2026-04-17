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

export interface IPrinterService {
  print(job: PrintJob): Promise<PrintResult>;
  isReady(): boolean;
  getStatus(): string;
}
