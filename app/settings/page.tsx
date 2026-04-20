"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { ClinicConfig } from "@/types/config";
import { configStore, SESSION_UNLOCKED_KEY } from "@/store/ConfigStore";
import { listPrinters, testPrinter, isTauriApp } from "@/services/ArgoxPrinterService";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Trash2, FlaskConical, RefreshCw, Download, CheckCircle } from "lucide-react";

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
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "available" | "downloading" | "up-to-date" | "error">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

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

  async function handleCheckUpdate() {
    setUpdateState("checking");
    setUpdateVersion(null);
    setUpdateError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update?.available) { setUpdateState("up-to-date"); return; }
      setUpdateVersion(update.version);
      setUpdateState("available");
    } catch (e) {
      setUpdateError(String(e));
      setUpdateState("error");
    }
  }

  async function handleInstallUpdate() {
    setUpdateState("downloading");
    setDownloadProgress(0);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      const update = await check();
      if (!update?.available) return;
      let downloaded = 0;
      let total = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await update.downloadAndInstall((event: any) => {
        if (event.event === "Started") { total = event.data.contentLength ?? 0; }
        else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setDownloadProgress(Math.round((downloaded / total) * 100));
        }
      });
      await relaunch();
    } catch {
      setUpdateState("available");
    }
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
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

          <Field label="Argox Printer" hint="Select the label printer installed on this computer">
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

        {/* App updates — only shown inside Tauri */}
        {isTauriApp() && (
          <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">App updates</p>
                <p className="text-xs text-slate-400">v{require("../../package.json").version}</p>
              </div>

              {updateState === "idle" || updateState === "up-to-date" || updateState === "error" ? (
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors"
                >
                  <RefreshCw size={13} />
                  Check for updates
                </button>
              ) : updateState === "checking" ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RefreshCw size={13} className="animate-spin" />
                  Checking…
                </span>
              ) : updateState === "available" ? (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Download size={12} />
                  Install v{updateVersion}
                </button>
              ) : null}
            </div>

            {updateState === "up-to-date" && (
              <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle size={12} /> Already on the latest version.
              </p>
            )}

            {updateState === "error" && updateError && (
              <p className="text-xs text-red-600 dark:text-red-400 break-all font-mono bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {updateError}
              </p>
            )}

            {updateState === "downloading" && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Downloading… {downloadProgress}%</p>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-4">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Danger zone</p>
          {!confirmReset ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              <Trash2 size={14} />
              Reset clinic configuration
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">Are you sure? This will clear all settings.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
