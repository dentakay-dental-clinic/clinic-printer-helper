"use client";

import { Appointment } from "@/types/appointment";
import { cn, formatDisplayDate } from "@/lib/utils";

interface LabelPreviewProps {
  appointment: Appointment;
  className?: string;
}

/**
 * Single label preview matching the physical Dentakay sticker:
 *
 * ┌──────────────────────────┐
 * │   Dentakay Dental Clinic │  ← dark header
 * │  Hasta Adı Soyadı: …     │
 * │  Doğum Tarihi: …         │
 * │  Cinsiyet: …             │
 * │  Ak Kodu: …              │
 * └──────────────────────────┘
 */
function mapGender(g: string | null | undefined): string {
  switch (g?.toUpperCase()) {
    case "MALE":   case "ERKEK": case "M": case "E": return "Erkek";
    case "FEMALE": case "KADIN": case "F": case "K": return "Kadın";
    default: return "-";
  }
}

export function LabelPreview({ appointment: a, className }: LabelPreviewProps) {
  return (
    <div className={cn("w-full rounded-lg border-2 border-slate-800 dark:border-slate-400 overflow-hidden bg-white text-black shadow font-sans text-[13px] leading-snug", className)}>
      {/* Dark header */}
      <div className="bg-slate-900 text-white px-3 py-2 text-center font-bold tracking-wide text-sm">
        Dentakay Dental Clinic
      </div>
      {/* Body */}
      <div className="px-3 py-2.5 space-y-1">
        <LabelLine label="Hasta Adı Soyadı" value={a.patient_name || "-"} />
        <LabelLine
          label="Doğum Tarihi"
          value={formatDisplayDate(a.patient_birth_date)}
          dim={!a.patient_birth_date}
        />
        <LabelLine
          label="Cinsiyet"
          value={mapGender(a.patient_gender)}
          dim={!a.patient_gender}
        />
        <LabelLine label="Ak Kodu" value={a.patient_ak || "-"} bold />
      </div>
    </div>
  );
}

function LabelLine({
  label,
  value,
  bold,
  dim,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dim?: boolean;
}) {
  return (
    <p className={cn("flex gap-1", dim && "opacity-40")}>
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className={cn("text-slate-900 break-words", bold && "font-semibold")}>{value}</span>
    </p>
  );
}
