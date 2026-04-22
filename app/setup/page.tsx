"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import {
  ClinicConfig,
  DEFAULT_CONFIG,
  DEFAULT_PRINTER_SETTINGS,
} from "@/types/config";
import { listPrinters } from "@/services/ArgoxPrinterService";
import { cn } from "@/lib/utils";
import { Printer, ChevronRight } from "lucide-react";

const MIN_LABEL_MM = 10;
const MAX_LABEL_MM = 200;
const MIN_TOP_OFFSET_MM = -20;
const MAX_TOP_OFFSET_MM = 20;

function parseLabelDimension(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < MIN_LABEL_MM || parsed > MAX_LABEL_MM) {
    return null;
  }
  return parsed;
}

function parseTopOffset(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < MIN_TOP_OFFSET_MM || parsed > MAX_TOP_OFFSET_MM) {
    return null;
  }
  return parsed;
}

export default function SetupPage() {
  const router = useRouter();
  const { saveConfig } = useClinicConfig();

  const [form, setForm] = useState({
    clinic_id: "",
    clinic_name: "",
    api_base_url: DEFAULT_CONFIG.api_base_url || "",
    default_quantity: String(DEFAULT_CONFIG.default_quantity ?? 7),
    pin_enabled: false,
    pin: "",
    printer_name: "",
    label_width_mm: String(DEFAULT_PRINTER_SETTINGS.label_width_mm),
    label_height_mm: String(DEFAULT_PRINTER_SETTINGS.label_height_mm),
    label_top_offset_mm: String(DEFAULT_PRINTER_SETTINGS.label_top_offset_mm),
  });
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Always try — listPrinters() returns [] gracefully when not in Tauri
  useEffect(() => {
    listPrinters().then(setPrinterList);
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const clinicId = parseInt(form.clinic_id, 10);
    if (!clinicId || isNaN(clinicId)) {
      setError("Clinic ID must be a valid number.");
      return;
    }
    if (!form.clinic_name.trim()) {
      setError("Clinic name is required.");
      return;
    }
    if (form.pin_enabled && form.pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    const labelWidth = parseLabelDimension(form.label_width_mm);
    const labelHeight = parseLabelDimension(form.label_height_mm);
    const topOffset = parseTopOffset(form.label_top_offset_mm);
    if (labelWidth === null || labelHeight === null) {
      setError(`Label dimensions must be between ${MIN_LABEL_MM} and ${MAX_LABEL_MM} mm.`);
      return;
    }
    if (topOffset === null) {
      setError(`Top offset must be between ${MIN_TOP_OFFSET_MM} and ${MAX_TOP_OFFSET_MM} mm.`);
      return;
    }

    const config: ClinicConfig = {
      clinic_id: clinicId,
      clinic_name: form.clinic_name.trim(),
      api_base_url: form.api_base_url.trim() || DEFAULT_CONFIG.api_base_url!,
      api_key: process.env.NEXT_PUBLIC_API_KEY || "",
      default_quantity: Math.max(1, parseInt(form.default_quantity, 10) || 7),
      pin_enabled: form.pin_enabled,
      pin: form.pin_enabled ? form.pin : undefined,
      printer_name: form.printer_name || undefined,
      printer_settings: {
        ...DEFAULT_PRINTER_SETTINGS,
        label_width_mm: labelWidth,
        label_height_mm: labelHeight,
        label_top_offset_mm: topOffset,
      },
    };

    saveConfig(config);
    router.replace("/"); // Go through the root router so PIN lock is enforced if set
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
            <Printer size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Clinic Print Helper
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set up your clinic installation
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 space-y-4"
        >
          <Field
            label="Clinic ID"
            hint="Your numeric clinic ID from the backend"
            required
          >
            <input
              type="number"
              value={form.clinic_id}
              onChange={(e) => update("clinic_id", e.target.value)}
              placeholder="e.g. 42"
              className={inputClass}
              required
            />
          </Field>

          <Field label="Clinic Name" required>
            <input
              type="text"
              value={form.clinic_name}
              onChange={(e) => update("clinic_name", e.target.value)}
              placeholder="e.g. Main Branch"
              className={inputClass}
              required
            />
          </Field>

          <Field
            label="API Base URL"
            hint="Leave as default unless instructed otherwise"
          >
            <input
              type="url"
              value={form.api_base_url}
              onChange={(e) => update("api_base_url", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Default label quantity"
            hint="How many labels to print per patient by default"
          >
            <input
              type="number"
              min={1}
              max={99}
              value={form.default_quantity}
              onChange={(e) => update("default_quantity", e.target.value)}
              className={inputClass}
            />
          </Field>

          {/* Printer selector — only meaningful inside Tauri */}
          <Field
            label="Label Printer"
            hint="Select the label printer installed on this computer."
          >
            {printerList.length > 0 ? (
              <select
                value={form.printer_name}
                onChange={(e) => update("printer_name", e.target.value)}
                className={inputClass}
              >
                <option value="">— Select printer —</option>
                {printerList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.printer_name}
                onChange={(e) => update("printer_name", e.target.value)}
                placeholder="e.g. Argox OS-214plus"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Label dimensions" hint="Millimeters">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Width</span>
                <input
                  type="number"
                  min={MIN_LABEL_MM}
                  max={MAX_LABEL_MM}
                  step="0.1"
                  value={form.label_width_mm}
                  onChange={(e) => update("label_width_mm", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Height</span>
                <input
                  type="number"
                  min={MIN_LABEL_MM}
                  max={MAX_LABEL_MM}
                  step="0.1"
                  value={form.label_height_mm}
                  onChange={(e) => update("label_height_mm", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Top offset</span>
                <input
                  type="number"
                  min={MIN_TOP_OFFSET_MM}
                  max={MAX_TOP_OFFSET_MM}
                  step="0.1"
                  value={form.label_top_offset_mm}
                  onChange={(e) => update("label_top_offset_mm", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </Field>

          {/* PIN toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable PIN lock
              </p>
              <p className="text-xs text-slate-400">
                Require PIN on app start
              </p>
            </div>
            <button
              type="button"
              onClick={() => update("pin_enabled", !form.pin_enabled)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                form.pin_enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  form.pin_enabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {form.pin_enabled && (
            <Field label="PIN" hint="Minimum 4 digits" required>
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => update("pin", e.target.value)}
                placeholder="••••"
                maxLength={8}
                className={inputClass}
              />
            </Field>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white",
              "hover:bg-indigo-700 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            )}
          >
            Save & Continue
            <ChevronRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
