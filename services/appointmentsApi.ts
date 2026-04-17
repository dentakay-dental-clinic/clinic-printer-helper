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

    if (Array.isArray(result)) {
      return result;
    }
    if (result && "data" in result && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (err) {
    throw err;
  }
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
