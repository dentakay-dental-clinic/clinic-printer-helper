/**
 * Response shape from GET /api/v1/patients/{patient_ak}/info
 * Sourced from MedicaSimple clinic/user/search?externalId=AK-xxx
 */
export interface PatientMSInfo {
  ms_id: number | null;
  external_id: string | null; // e.g. "AK-1234567"
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;   // "YYYY-MM-DD"
  gender_code: string | null;  // "M" | "F" | ...
  gender_name: string | null;  // "Male" | "Female" | ...
  nationality: string | null;
  country_code: string | null;
  communication_language: string | null;
  national_id: string | null;
  balance: number | null;
  paid_amount: number | null;
  gdpr_approved: boolean | null;
  last_appointment: string | null;
  clinic_id: number | null;
  clinic_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}
