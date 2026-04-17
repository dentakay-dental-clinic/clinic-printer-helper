export interface ClinicConfig {
  clinic_id: number;
  clinic_name: string;
  /** Backend API base URL — default: https://ms-integration-api.dentakay.com/api/v1 */
  api_base_url: string;
  /** Shared API key injected at build time via NEXT_PUBLIC_API_KEY — stored here for runtime override */
  api_key: string;
  /** Default label print quantity per patient */
  default_quantity: number;
  /** Whether PIN lock is enabled */
  pin_enabled: boolean;
  /** PIN code (stored locally, not sent to server) */
  pin?: string;
  /** Windows printer name exactly as shown in "Devices and Printers" */
  printer_name?: string;
  /** Placeholder for future Tauri printer hardware settings */
  printer_settings: Record<string, unknown>;
}

export const DEFAULT_CONFIG: Partial<ClinicConfig> = {
  api_base_url:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://ms-integration-api.dentakay.com/api/v1",
  api_key: process.env.NEXT_PUBLIC_API_KEY || "",
  default_quantity: 7,
  pin_enabled: false,
  printer_settings: {},
};
