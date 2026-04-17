"use client";

import { Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  quantity: number;
  onQuantityChange: (q: number) => void;
  onPrint: () => void;
  onClear: () => void;
  onSelectAll: () => void;
  totalVisible: number;
}

export function BulkActionBar({
  selectedCount,
  quantity,
  onQuantityChange,
  onPrint,
  onClear,
  onSelectAll,
  totalVisible,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "flex items-center justify-between gap-4 px-6 py-3",
        "bg-indigo-700 text-white shadow-xl border-t border-indigo-800"
      )}
    >
      {/* Left: count & select-all */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="text-indigo-200 hover:text-white transition-colors"
          aria-label="Clear selection"
        >
          <X size={18} />
        </button>
        <span className="font-semibold text-sm">
          {selectedCount} selected
        </span>
        {selectedCount < totalVisible && (
          <button
            onClick={onSelectAll}
            className="text-xs underline text-indigo-200 hover:text-white transition-colors"
          >
            Select all {totalVisible}
          </button>
        )}
      </div>

      {/* Right: quantity + print */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-indigo-200">
          <span>Labels each:</span>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value)))}
            className={cn(
              "w-16 rounded-md border border-indigo-500 bg-indigo-600",
              "text-center text-white text-sm font-semibold py-1 px-2",
              "focus:outline-none focus:ring-2 focus:ring-white"
            )}
          />
        </label>

        <button
          onClick={onPrint}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-5 py-2",
            "bg-white text-indigo-700 font-semibold text-sm",
            "hover:bg-indigo-50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700"
          )}
        >
          <Printer size={14} />
          Print {selectedCount} patient{selectedCount !== 1 ? "s" : ""} ×{" "}
          {quantity}
        </button>
      </div>
    </div>
  );
}
