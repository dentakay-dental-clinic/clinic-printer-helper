"use client";

import { useEffect, useState, useCallback } from "react";
import { isTauriApp } from "@/services/ArgoxPrinterService";
import { Download, X, RotateCcw } from "lucide-react";

type State =
  | { phase: "idle" }
  | { phase: "available"; version: string }
  | { phase: "downloading"; progress: number }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export default function UpdateBanner() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauriApp()) return;
    const t = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update?.available) setState({ phase: "available", version: update.version });
      } catch (e) {
        setState({ phase: "error", message: String(e) });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleUpdate = useCallback(async () => {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      const update = await check();
      if (!update?.available) return;

      setState({ phase: "downloading", progress: 0 });

      let downloaded = 0;
      let total = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await update.downloadAndInstall((event: any) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0)
            setState({ phase: "downloading", progress: Math.round((downloaded / total) * 100) });
        } else if (event.event === "Finished") {
          setState({ phase: "ready" });
        }
      });

      await relaunch();
    } catch (e) {
      setState({ phase: "error", message: String(e) });
    }
  }, []);

  if (state.phase === "idle" || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-72">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">

        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
          <Download size={14} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        <div className="flex-1 min-w-0">
          {state.phase === "available" && (
            <>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                v{state.version} available
              </p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Restart to get the latest version.
              </p>
            </>
          )}
          {state.phase === "downloading" && (
            <>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                Downloading… {state.progress}%
              </p>
              <div className="mt-1.5 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </>
          )}
          {state.phase === "ready" && (
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 leading-tight">
              Installed — restart the app to apply.
            </p>
          )}
          {state.phase === "error" && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-tight break-all">
              Update check failed: {state.message}
            </p>
          )}
        </div>

        {state.phase === "ready" && (
          <button
            onClick={async () => {
              const { relaunch } = await import("@tauri-apps/plugin-process");
              await relaunch();
            }}
            className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
          >
            <RotateCcw size={11} />
            Restart
          </button>
        )}

        {(state.phase === "error") && (
          <button
            onClick={() => setDismissed(true)}
            className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        )}

        {state.phase === "available" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleUpdate}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Update
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
