export interface PrinterSettings {
  /** Physical label width in millimeters */
  label_width_mm?: number;
  /** Physical label height/feed direction in millimeters */
  label_height_mm?: number;
  /** Vertical content offset from the top edge in millimeters */
  label_top_offset_mm?: number;
}

export const DEFAULT_PRINTER_SETTINGS: Required<PrinterSettings> = {
  label_width_mm: 57,
  label_height_mm: 27,
  label_top_offset_mm: 0,
};

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
  /** OS printer queue name exactly as shown in the printer list */
  printer_name?: string;
  /** Printer hardware and label stock settings */
  printer_settings: PrinterSettings;
}

export const DEFAULT_CONFIG: Partial<ClinicConfig> = {
  api_base_url:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://ms-integration-api.dentakay.com/api/v1",
  api_key: process.env.NEXT_PUBLIC_API_KEY || "",
  default_quantity: 7,
  pin_enabled: false,
  printer_settings: DEFAULT_PRINTER_SETTINGS,
};
