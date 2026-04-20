import { PatientMSInfo } from "@/types/patient";
import { Appointment } from "@/types/appointment";
import { ApiClient } from "./api";

/**
 * Fetches raw patient info from MedicaSimple via ms-integration.
 * Endpoint: GET /api/v1/patients/{patient_ak}/info
 *
 * Normalises the AK before sending: strips leading/trailing whitespace
 * and ensures it starts with "AK-" so the backend can resolve it.
 *
 * Throws on network errors or non-200 responses.
 * Returns null when the backend returns 404 (patient not found).
 */
export async function fetchPatientByAk(
  client: ApiClient,
  ak: string
): Promise<PatientMSInfo | null> {
  const normalised = normaliseAk(ak);
  try {
    const result = await client.get<PatientMSInfo>(`/patients/${encodeURIComponent(normalised)}/info`);
    return result;
  } catch (err: unknown) {
    // Surface 404 as "not found" (null) so callers can show a friendly message
    if (err instanceof Error && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/**
 * Maps a PatientMSInfo object into a minimal Appointment-shaped object
 * so it can be passed into PrintModal and the existing print pipeline
 * without any changes to those components.
 *
 * Fields that don't apply (appointment_id, status, type, etc.) get
 * safe placeholder values.
 */
export function patientMSInfoToAppointment(info: PatientMSInfo): Appointment {
  const fullName = [info.first_name, info.last_name].filter(Boolean).join(" ") || "Unknown";

  // Map gender_name → Turkish convention that the label/system already uses
  const gender = mapGender(info.gender_name);

  return {
    appointment_id: -(info.ms_id ?? 0), // negative so it never clashes with real IDs
    patient_ms_id: info.ms_id ?? 0,
    patient_ak: info.external_id ?? "",
    patient_name: fullName,
    doctor_ms_id: 0,
    clinic_id: info.clinic_id ?? 0,
    start_date_ms: new Date().toISOString(), // no appointment time — use now as placeholder
    duration_as_minute: 0,
    status_code: "WALK_IN",
    status_name: "Walk-in",
    type_name: "Direct",
    title: null,
    notes: null,
    created_at_ms: info.created_at ?? "",
    updated_at_ms: info.updated_at ?? "",
    synced_at: "",
    patient_birth_date: info.birth_date ?? null,
    patient_gender: gender,
  };
}

/**
 * Enriches a list of appointments with gender (and birth date) from the
 * MedicaSimple patient info endpoint.
 *
 * - Runs all requests in parallel (Promise.allSettled) so one failure
 *   doesn't block the rest.
 * - Skips appointments that already have both fields.
 * - Skips appointments with no patient_ak.
 * - On any per-patient error, returns the original appointment unchanged.
 */
export async function enrichAppointmentsWithDemographics(
  client: ApiClient,
  appointments: Appointment[]
): Promise<Appointment[]> {
  const results = await Promise.allSettled(
    appointments.map(async (appt): Promise<Appointment> => {
      // Already have both — no need for an extra call
      if (appt.patient_gender && appt.patient_birth_date) return appt;
      if (!appt.patient_ak) return appt;

      try {
        const info = await fetchPatientByAk(client, appt.patient_ak);
        if (!info) return appt;
        return {
          ...appt,
          patient_gender: appt.patient_gender ?? mapGender(info.gender_name),
          patient_birth_date: appt.patient_birth_date ?? info.birth_date,
        };
      } catch {
        return appt;
      }
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : appointments[i]
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Ensures AK is in AK-XXXXXXX format. */
function normaliseAk(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.startsWith("AK-") || trimmed.startsWith("PP-")) return trimmed;
  // bare number → prepend AK-
  if (/^\d+$/.test(trimmed)) return `AK-${trimmed}`;
  return trimmed;
}

/**
 * Maps MS gender_name to the same convention already used in the app
 * ("ERKEK" / "KADIN") so the label template renders consistently.
 */
function mapGender(genderName: string | null): string | null {
  if (!genderName) return null;
  const g = genderName.toUpperCase();
  if (g === "MALE" || g === "ERKEK" || g === "M") return "ERKEK";
  if (g === "FEMALE" || g === "KADIN" || g === "F" || g === "K") return "KADIN";
  return genderName; // return as-is if unrecognised
}
