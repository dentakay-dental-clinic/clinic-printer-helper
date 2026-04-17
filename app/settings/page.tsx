"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { ClinicConfig } from "@/types/config";
import { configStore, SESSION_UNLOCKED_KEY } from "@/store/ConfigStore";
import { listPrinters, testPrinter, isTauriApp } from "@/services/ArgoxPrinterService";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Trash2, FlaskConical } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { config, saveConfig, clearConfig } = useClinicConfig();

  const [form, setForm] = useState({
    clinic_id: "",
    clinic_name: "",
    api_base_url: "",
    default_quantity: "7",
    pin_enabled: false,
    pin: "",
    printer_name: "",
  });
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        clinic_id: String(config.clinic_id),
        clinic_name: config.clinic_name,
        api_base_url: config.api_base_url,
        default_quantity: String(config.default_quantity),
        pin_enabled: config.pin_enabled,
        pin: config.pin || "",
        printer_name: config.printer_name || "",
      });
    }
  }, [config]);

  useEffect(() => {
    listPrinters().then(setPrinterList);
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const clinicId = parseInt(form.clinic_id, 10);
    if (!clinicId) { setError("Clinic ID must be a number."); return; }
    if (!form.clinic_name.trim()) { setError("Clinic name is required."); return; }
    if (form.pin_enabled && form.pin.length < 4) { setError("PIN must be at least 4 digits."); return; }

    const updated: ClinicConfig = {
      clinic_id: clinicId,
      clinic_name: form.clinic_name.trim(),
      api_base_url: form.api_base_url.trim(),
      api_key: config?.api_key || process.env.NEXT_PUBLIC_API_KEY || "",
      default_quantity: Math.max(1, parseInt(form.default_quantity, 10) || 7),
      pin_enabled: form.pin_enabled,
      pin: form.pin_enabled ? form.pin : undefined,
      printer_name: form.printer_name || undefined,
      printer_settings: config?.printer_settings || {},
    };
    saveConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm("Reset all clinic configuration? The app will return to setup.")) return;
    configStore.remove(SESSION_UNLOCKED_KEY);
    clearConfig();
    router.replace("/setup");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <Field label="Clinic ID" required>
            <input type="number" value={form.clinic_id} onChange={(e) => update("clinic_id", e.target.value)} className={inputClass} required />
          </Field>

          <Field label="Clinic Name" required>
            <input type="text" value={form.clinic_name} onChange={(e) => update("clinic_name", e.target.value)} className={inputClass} required />
          </Field>

          <Field label="API Base URL">
            <input type="url" value={form.api_base_url} onChange={(e) => update("api_base_url", e.target.value)} className={inputClass} />
          </Field>

          <Field label="Default label quantity">
            <input type="number" min={1} max={99} value={form.default_quantity} onChange={(e) => update("default_quantity", e.target.value)} className={inputClass} />
          </Field>

          <Field label="Argox Printer" hint="Select the label printer from Windows">
            {printerList.length > 0 ? (
              <select
                value={form.printer_name}
                onChange={(e) => { update("printer_name", e.target.value); setTestResult(null); }}
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
                onChange={(e) => { update("printer_name", e.target.value); setTestResult(null); }}
                placeholder="e.g. Argox OS-214 plus series PPLA"
                className={inputClass}
              />
            )}

            {/* Test connection button — only shown inside Tauri */}
            {isTauriApp() && form.printer_name && (
              <button
                type="button"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  setTestResult(null);
                  const result = await testPrinter(form.printer_name);
                  setTestResult(result);
                  setTesting(false);
                }}
                className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <FlaskConical size={13} />
                {testing ? "Testing…" : "Test connection"}
              </button>
            )}

            {testResult && (
              <p className={cn(
                "mt-2 text-xs rounded-lg px-3 py-2 whitespace-pre-wrap font-mono",
                testResult.startsWith("✅")
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {testResult}
              </p>
            )}
          </Field>

          {/* PIN toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">PIN lock</p>
            <button
              type="button"
              onClick={() => update("pin_enabled", !form.pin_enabled)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.pin_enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
              )}
            >
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", form.pin_enabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          {form.pin_enabled && (
            <Field label="PIN" hint="Minimum 4 digits" required>
              <input type="password" inputMode="numeric" value={form.pin} onChange={(e) => update("pin", e.target.value)} placeholder="••••" maxLength={8} className={inputClass} />
            </Field>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Save size={14} />
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </form>

        {/* Danger zone */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-4">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Danger zone</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            <Trash2 size={14} />
            Reset clinic configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
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

const inputClass = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
