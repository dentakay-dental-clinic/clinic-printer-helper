import { ClinicConfig } from "@/types/config";

interface ApiClientOptions {
  baseUrl: string;
  apiKey: string;
}

interface GetOptions {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Lightweight fetch wrapper.
 * Injects X-API-KEY header on every request.
 * All appointment-specific logic lives in appointmentsApi.ts.
 */
function createApiClient({ baseUrl, apiKey }: ApiClientOptions) {
  const base = baseUrl.replace(/\/$/, "");

  async function get<T>(path: string, options: GetOptions = {}): Promise<T> {
    if (!base) throw new Error("API base URL is not configured. Go to Settings and enter the API URL.");
    const url = new URL(`${base}${path}`);

    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `API error ${response.status} on GET ${path}: ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  return { get };
}

/** Creates an API client from the stored ClinicConfig.
 *
 * Key resolution order:
 *  1. NEXT_PUBLIC_API_KEY env var (shared key baked in at build / dev time)
 *  2. config.api_key (locally stored override, e.g. for testing)
 *
 * This ensures the env var always wins without requiring a re-run of setup.
 */
export function createClientFromConfig(config: ClinicConfig) {
  const apiKey =
    process.env.NEXT_PUBLIC_API_KEY?.trim() ||
    config.api_key?.trim() ||
    "";

  return createApiClient({
    baseUrl:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      config.api_base_url,
    apiKey,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
