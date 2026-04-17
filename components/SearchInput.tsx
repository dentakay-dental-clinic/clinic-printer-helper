"use client";

import { Search, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  large?: boolean;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search by name or AK…",
  className,
  large = false,
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small timeout ensures it focuses after any immediate re-renders/modals closing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  return (
    <div className={cn("relative flex items-center shadow-sm rounded-xl", className)}>
      <Search
        size={large ? 20 : 15}
        className={cn(
          "absolute pointer-events-none text-indigo-500",
          large ? "left-4" : "left-3"
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-white transition-all duration-200 outline-none",
          "placeholder:text-slate-400 text-slate-900",
          "dark:bg-slate-900 dark:text-slate-100",
          large
            ? "py-3.5 pl-12 pr-10 rounded-xl text-base font-medium border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:border-indigo-800/80 dark:focus:border-indigo-500"
            : "py-2 pl-9 pr-9 rounded-lg text-sm border-2 border-indigo-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-indigo-900/40 dark:focus:border-indigo-400"
        )}
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className={cn(
            "absolute text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors",
            large ? "right-4" : "right-3"
          )}
          aria-label="Clear search"
        >
          <X size={large ? 18 : 14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
