"use client";

import { Appointment } from "@/types/appointment";
import { cn, formatDisplayDate } from "@/lib/utils";

interface EditProp {
  value: string;
  onChange: (v: string) => void;
}

interface LabelPreviewProps {
  appointment: Appointment;
  className?: string;
  editGender?: EditProp;
  editBirthDate?: EditProp;
}

function mapGender(g: string | null | undefined): string {
  switch (g?.toUpperCase()) {
    case "MALE":   case "ERKEK": case "M": case "E": return "Erkek";
    case "FEMALE": case "KADIN": case "F": case "K": return "Kadın";
    default: return "-";
  }
}

export function LabelPreview({ appointment: a, className, editGender, editBirthDate }: LabelPreviewProps) {
  return (
    <div className={cn("w-full rounded-lg border-2 border-slate-800 dark:border-slate-400 overflow-hidden bg-white text-black shadow font-sans text-[13px] leading-snug", className)}>
      <div className="bg-slate-900 text-white px-3 py-2 text-center font-bold tracking-wide text-sm">
        Dentakay Dental Clinic
      </div>
      <div className="px-3 py-2.5 space-y-1">
        <LabelLine label="Hasta Adı Soyadı" value={a.patient_name || "-"} />
        <LabelLine
          label="Doğum Tarihi"
          value={formatDisplayDate(a.patient_birth_date)}
          dim={!a.patient_birth_date}
          edit={editBirthDate ? { type: "date", raw: editBirthDate.value, onChange: editBirthDate.onChange } : undefined}
        />
        <LabelLine
          label="Cinsiyet"
          value={mapGender(a.patient_gender)}
          dim={!a.patient_gender}
          edit={editGender ? { type: "gender", raw: editGender.value, onChange: editGender.onChange } : undefined}
        />
        <LabelLine label="Ak Kodu" value={a.patient_ak || "-"} bold />
      </div>
    </div>
  );
}

type EditConfig =
  | { type: "gender"; raw: string; onChange: (v: string) => void }
  | { type: "date";   raw: string; onChange: (v: string) => void };

function LabelLine({
  label,
  value,
  bold,
  dim,
  edit,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dim?: boolean;
  edit?: EditConfig;
}) {
  return (
    <p className="flex gap-1 items-baseline">
      <span className="text-slate-500 shrink-0">{label}:</span>

      {edit ? (
        edit.type === "gender" ? (
          <select
            value={edit.raw}
            onChange={(e) => edit.onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className={cn(
              "flex-1 bg-transparent text-[13px] text-slate-900 cursor-pointer",
              "border-0 border-b border-dashed border-slate-400",
              "focus:outline-none focus:border-indigo-500",
              "py-0 px-0 appearance-none leading-snug",
              !edit.raw && "text-slate-400 italic"
            )}
          >
            <option value="" disabled>tap to select…</option>
            <option value="ERKEK">Erkek</option>
            <option value="KADIN">Kadın</option>
          </select>
        ) : (
          <input
            type="date"
            value={edit.raw}
            onChange={(e) => edit.onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className={cn(
              "flex-1 bg-transparent text-[13px] text-slate-900",
              "border-0 border-b border-dashed border-slate-400",
              "focus:outline-none focus:border-indigo-500",
              "py-0 px-0 leading-snug",
              !edit.raw && "text-slate-400"
            )}
          />
        )
      ) : (
        <span className={cn("text-slate-900 break-words", bold && "font-semibold", dim && "opacity-40")}>
          {value}
        </span>
      )}
    </p>
  );
}
