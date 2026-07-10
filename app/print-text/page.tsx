"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useClinicConfig } from "@/contexts/ClinicConfigContext";
import { printerService as webPrinterService } from "@/services/WebPrinterService";
import { ArgoxPrinterService, isTauriApp } from "@/services/ArgoxPrinterService";
import { IPrinterService } from "@/services/PrinterService";
import { cn } from "@/lib/utils";
import { ArrowLeft, Printer, Type, AlignLeft, AlignCenter, Loader2, Minus, Plus } from "lucide-react";

const FONT_SIZES = [
  { label: "S", pt: 10 },
  { label: "M", pt: 12 },
  { label: "L", pt: 16 },
  { label: "XL", pt: 22 },
] as const;

const MAX_QUANTITY = 99;

export default function PrintTextPage() {
  const router = useRouter();
  const { config } = useClinicConfig();

  const labelWidthMm = config?.printer_settings?.label_width_mm ?? 57;
  const labelHeightMm = config?.printer_settings?.label_height_mm ?? 27;
  const labelTopOffsetMm = config?.printer_settings?.label_top_offset_mm;

  // Native printing inside Tauri; window.print() fallback in the browser
  const printerService = useMemo<IPrinterService>(() => {
    if (isTauriApp() && config?.printer_name) {
      return new ArgoxPrinterService(config.printer_name, {
        label_width_mm: labelWidthMm,
        label_height_mm: labelHeightMm,
        label_top_offset_mm: labelTopOffsetMm,
      });
    }
    return webPrinterService;
  }, [config?.printer_name, labelWidthMm, labelHeightMm, labelTopOffsetMm]);

  const [text, setText] = useState("");
  const [fontPt, setFontPt] = useState<number>(12);
  const [align, setAlign] = useState<"left" | "center">("center");
  const [quantity, setQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const canPrint = text.trim().length > 0 && quantity > 0 && !isPrinting;

  async function handlePrint() {
    if (!canPrint) return;
    setIsPrinting(true);
    try {
      const r = await printerService.printText({ text, quantity, fontPt, align });
      showToast(r.message, r.success);
    } catch {
      showToast("Print failed. Check printer.", false);
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/appointments")}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Appointments</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Type size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                Text Label
              </h1>
              <p className="text-[10px] text-slate-400">Print free text on a label</p>
            </div>
          </div>

          <div className={cn(
            "hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isTauriApp() && config?.printer_name
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isTauriApp() && config?.printer_name ? "bg-green-500 animate-pulse" : "bg-amber-500"
            )} />
            {printerService.getStatus()}
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <main className="flex-1 bg-[#f0f0f0] dark:bg-slate-950 flex flex-col items-center px-6 py-10 gap-3">
        <div className="w-full max-w-2xl flex flex-col gap-3">

          {/* Editor card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-indigo-500/5 p-5 flex flex-col gap-4 border border-slate-200 dark:border-slate-800">

            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type anything to print on the label…&#10;New lines are preserved."
              rows={4}
              className="w-full resize-y rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-base leading-relaxed outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

              {/* Font size */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Size</span>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {FONT_SIZES.map((f, i) => (
                    <button
                      key={f.pt}
                      onClick={() => setFontPt(f.pt)}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold transition-colors",
                        i !== 0 && "border-l border-slate-200 dark:border-slate-700",
                        fontPt === f.pt
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Align</span>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {([
                    { key: "left", icon: AlignLeft },
                    { key: "center", icon: AlignCenter },
                  ] as const).map(({ key, icon: Icon }, i) => (
                    <button
                      key={key}
                      onClick={() => setAlign(key)}
                      className={cn(
                        "px-3 py-1.5 transition-colors",
                        i !== 0 && "border-l border-slate-200 dark:border-slate-700",
                        align === key
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Copies</span>
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={MAX_QUANTITY}
                    value={quantity}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setQuantity(Number.isNaN(n) ? 1 : Math.max(1, Math.min(MAX_QUANTITY, n)));
                    }}
                    className="w-12 text-center bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none border-x border-slate-200 dark:border-slate-700 py-1.5 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                    className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Preview</span>
            <LabelPreview
              text={text}
              fontPt={fontPt}
              align={align}
              widthMm={labelWidthMm}
              heightMm={labelHeightMm}
            />
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={!canPrint}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {isPrinting ? "Printing…" : `Print ${quantity} label${quantity > 1 ? "s" : ""}`}
          </button>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in slide-in-from-top-2",
          toast.ok ? "bg-green-600" : "bg-red-600"
        )}>
          {toast.ok ? "✓" : "✕"} {toast.message}
        </div>
      )}
    </div>
  );
}

// ── On-screen approximation of the printed label ─────────────────────────────
function LabelPreview({
  text,
  fontPt,
  align,
  widthMm,
  heightMm,
}: {
  text: string;
  fontPt: number;
  align: "left" | "center";
  widthMm: number;
  heightMm: number;
}) {
  // Scale mm → px for a comfortable on-screen size (thermal labels are small).
  const PX_PER_MM = 4;
  return (
    <div
      className="bg-white shadow-md ring-1 ring-slate-300 overflow-hidden flex flex-col justify-center"
      style={{
        width: widthMm * PX_PER_MM,
        height: heightMm * PX_PER_MM,
        padding: `${1.5 * PX_PER_MM}px ${2 * PX_PER_MM}px`,
        textAlign: align,
      }}
    >
      <div
        style={{
          // pt → px at ~96 dpi (1pt = 1.333px)
          fontSize: fontPt * 1.333,
          lineHeight: 1.25,
          fontWeight: 700,
          color: "#000",
          fontFamily: "Arial, Helvetica, sans-serif",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text || <span className="text-slate-300">Your text…</span>}
      </div>
    </div>
  );
}
