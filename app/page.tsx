"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { configStore, SESSION_UNLOCKED_KEY } from "@/store/ConfigStore";

/**
 * Root route — smart router.
 * No config → /setup
 * PIN enabled + not unlocked → /lock
 * Otherwise → /appointments
 */
export default function RootPage() {
  const router = useRouter();
  const { config, isConfigured, isLoading } = useClinicConfig();

  useEffect(() => {
    if (isLoading) return;

    if (!isConfigured) {
      router.replace("/setup");
      return;
    }

    if (config?.pin_enabled) {
      const unlocked = configStore.get<boolean>(SESSION_UNLOCKED_KEY);
      if (!unlocked) {
        router.replace("/lock");
        return;
      }
    }

    router.replace("/appointments");
  }, [isLoading, isConfigured, config, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  );
}
