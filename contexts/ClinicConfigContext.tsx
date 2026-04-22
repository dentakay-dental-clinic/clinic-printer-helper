"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  ClinicConfig,
  DEFAULT_CONFIG,
  DEFAULT_PRINTER_SETTINGS,
} from "@/types/config";
import { configStore, CONFIG_STORE_KEY } from "@/store/ConfigStore";

interface ClinicConfigContextValue {
  config: ClinicConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  saveConfig: (config: ClinicConfig) => void;
  clearConfig: () => void;
}

const ClinicConfigContext = createContext<ClinicConfigContextValue | null>(null);

export function ClinicConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = configStore.get<ClinicConfig>(CONFIG_STORE_KEY);
    if (stored) {
      // Merge with defaults so new fields get populated without requiring re-setup
      setConfig({
        ...DEFAULT_CONFIG,
        ...stored,
        printer_settings: {
          ...DEFAULT_PRINTER_SETTINGS,
          ...(stored.printer_settings || {}),
        },
      } as ClinicConfig);
    }
    setIsLoading(false);
  }, []);

  const saveConfig = useCallback((newConfig: ClinicConfig) => {
    configStore.set(CONFIG_STORE_KEY, newConfig);
    setConfig(newConfig);
  }, []);

  const clearConfig = useCallback(() => {
    configStore.remove(CONFIG_STORE_KEY);
    setConfig(null);
  }, []);

  return (
    <ClinicConfigContext.Provider
      value={{
        config,
        isConfigured: config !== null && !!config.clinic_id,
        isLoading,
        saveConfig,
        clearConfig,
      }}
    >
      {children}
    </ClinicConfigContext.Provider>
  );
}

export function useClinicConfig() {
  const ctx = useContext(ClinicConfigContext);
  if (!ctx) throw new Error("useClinicConfig must be used within ClinicConfigProvider");
  return ctx;
}
