// Appointment data shape — source of truth from ms-integration-api
export interface Appointment {
  appointment_id: number;
  patient_ms_id: number;
  patient_ak: string;
  patient_name: string;
  doctor_ms_id: number;
  clinic_id: number;
  start_date_ms: string; // ISO datetime string
  duration_as_minute: number;
  status_code: string;
  status_name: string;
  type_name: string;
  title: string | null;
  notes: string | null;
  created_at_ms: string;
  updated_at_ms: string;
  synced_at: string;
  /** Added when API starts returning patient demographics */
  patient_birth_date?: string | null; // e.g. "1990-05-15"
  patient_gender?: string | null;     // e.g. "ERKEK" / "KADIN"
}

// Query params for the appointments endpoint
export interface AppointmentQueryParams {
  clinic_id: number;
  start_date: string; // DD-MM-YYYY
  end_date: string; // DD-MM-YYYY
  live?: boolean;
}

// Transfer status (for future printing workflow expansion)
export type TransferStatusValue =
  | "pending"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "incomplete";
