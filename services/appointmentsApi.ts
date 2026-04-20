import { Appointment, AppointmentQueryParams } from "@/types/appointment";
import { ApiClient } from "./api";

/**
 * All appointment API request logic lives here.
 * Endpoint:  GET /appointments
 * Params:    clinic_id, start_date (DD-MM-YYYY), end_date (DD-MM-YYYY), live?
 * Auth:      X-API-KEY header (injected by ApiClient)
 *
 * NOTE: To change the endpoint shape, update only this file.
 */

export interface AppointmentsResponse {
  data: Appointment[];
  total?: number;
}

export async function fetchAppointments(
  client: ApiClient,
  params: AppointmentQueryParams
): Promise<Appointment[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    clinic_id: params.clinic_id,
    start_date: params.start_date,
    end_date: params.end_date,
  };

  if (params.live !== undefined) {
    queryParams.live = params.live;
  }

  try {
    // Try to unwrap { data: [...] } or fall back to a raw array
    const result = await client.get<AppointmentsResponse | Appointment[]>(
      "/appointments",
      { params: queryParams }
    );

    let rows: Appointment[];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result && "data" in result && Array.isArray(result.data)) {
      rows = result.data;
    } else {
      return [];
    }

    // The API returns gender_code ("M"/"F") alongside each appointment but
    // our Appointment type uses patient_gender ("ERKEK"/"KADIN").
    // Map it here so the rest of the app never has to care about gender_code.
    return rows.map((appt) => {
      const raw = appt as Appointment & { gender_code?: string | null };
      if (raw.patient_gender || !raw.gender_code) return appt;
      return { ...appt, patient_gender: mapGenderCode(raw.gender_code) };
    });
  } catch (err) {
    throw err;
  }
}

function mapGenderCode(code: string): string {
  const c = code.toUpperCase();
  if (c === "M" || c === "MALE" || c === "ERKEK") return "ERKEK";
  if (c === "F" || c === "FEMALE" || c === "KADIN") return "KADIN";
  return code;
}

/** Format a JS Date as DD-MM-YYYY for the API */
export function formatApiDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

/** Returns today's date range params */
export function todayParams(clinicId: number): AppointmentQueryParams {
  const today = new Date();
  const formatted = formatApiDate(today);
  return {
    clinic_id: clinicId,
    start_date: formatted,
    end_date: formatted,
  };
}
