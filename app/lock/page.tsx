"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { configStore, SESSION_UNLOCKED_KEY } from "@/store/ConfigStore";
import { cn } from "@/lib/utils";
import { Lock, Delete } from "lucide-react";

export default function LockPage() {
  const router = useRouter();
  const { config } = useClinicConfig();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleDigit(d: string) {
    if (pin.length >= 8) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (config?.pin && next.length >= config.pin.length) {
      if (next === config.pin) {
        configStore.set(SESSION_UNLOCKED_KEY, true);
        router.replace("/appointments");
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 700);
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }

  // Physical keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { handleDigit(e.key); return; }
      if (e.key === "Backspace") handleDelete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-950 p-4">
      <div className="w-full max-w-xs text-center space-y-8">
        <div>
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {config?.clinic_name || "Clinic Print Helper"}
          </h1>
          <p className="text-sm text-indigo-300 mt-1">Enter PIN to unlock</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: config?.pin?.length || 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full border-2 transition-all duration-100",
                error
                  ? "border-red-400 bg-red-400"
                  : i < pin.length
                  ? "border-indigo-400 bg-indigo-400"
                  : "border-slate-600 bg-transparent"
              )}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className={cn(
                "h-14 rounded-2xl text-xl font-semibold text-white",
                "bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all",
                d === "0" && "col-start-2"
              )}
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete size={18} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 font-medium animate-pulse">
            Incorrect PIN
          </p>
        )}
      </div>
    </div>
  );
}
