"use client";

import { useEffect } from "react";
import { isTauriApp } from "@/services/ArgoxPrinterService";

/**
 * Silent auto-updater — runs on every launch inside Tauri.
 * If a new version is available it downloads and installs it,
 * then relaunches the app automatically. No UI shown.
 */
export default function UpdateBanner() {
  useEffect(() => {
    if (!isTauriApp()) return;

    const t = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const { relaunch } = await import("@tauri-apps/plugin-process");
        const update = await check();
        if (!update?.available) return;
        await update.downloadAndInstall();
        await relaunch();
      } catch {
        // Never crash the app over an update failure
      }
    }, 3000); // wait 3s so the app fully loads first

    return () => clearTimeout(t);
  }, []);

  return null;
}
