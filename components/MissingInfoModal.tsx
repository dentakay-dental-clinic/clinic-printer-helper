"use client";

import { useState } from "react";
import { Appointment } from "@/types/appointment";
import { X, AlertTriangle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MissingInfoModalProps {
  patients: Appointment[];
  onConfirm: (filledPatients: Appointment[]) => void;
  onClose: () => void;
}

type PatientEdit = { gender: string; birthDate: string };

export function MissingInfoModal({ patients, onConfirm, onClose }: MissingInfoModalProps) {
  const [edits, setEdits] = useState<Record<number, PatientEdit>>(() => {
    const init: Record<number, PatientEdit> = {};
    patients.forEach((p) => {
      init[p.appointment_id] = {
        gender: p.patient_gender ?? "",
        birthDate: p.patient_birth_date ?? "",
      };
    });
    return init;
  });

  function setGender(id: number, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], gender: value } }));
  }

  function setBirthDate(id: number, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], birthDate: value } }));
  }

  function handleConfirm() {
    const filled = patients.map((p) => ({
      ...p,
      patient_gender: edits[p.appointment_id]?.gender || p.patient_gender || null,
      patient_birth_date: edits[p.appointment_id]?.birthDate || p.patient_birth_date || null,
    }));
    onConfirm(filled);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Missing Patient Info
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {patients.length === 1
              ? "This patient is missing gender or birthday info. Fill in the details below before printing."
              : `${patients.length} patients are missing gender or birthday info. Fill in the details below before printing.`}
          </p>

          {patients.map((p) => {
            const edit = edits[p.appointment_id];
            const needsGender = !p.patient_gender;
            const needsBirthDate = !p.patient_birth_date;

            return (
              <div
                key={p.appointment_id}
                className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {p.patient_name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {p.patient_ak}
                  </p>
                </div>

                <div className={cn("grid gap-2", needsGender && needsBirthDate ? "grid-cols-2" : "grid-cols-1")}>
                  {needsGender && (
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Gender
                      </label>
                      <select
                        value={edit.gender}
                        onChange={(e) => setGender(p.appointment_id, e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select…</option>
                        <option value="ERKEK">Erkek (Male)</option>
                        <option value="KADIN">Kadın (Female)</option>
                      </select>
                    </div>
                  )}

                  {needsBirthDate && (
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        Birthday
                      </label>
                      <input
                        type="date"
                        value={edit.birthDate}
                        onChange={(e) => setBirthDate(p.appointment_id, e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <UserCheck size={14} />
            Continue to Print
          </button>
        </div>
      </div>
    </div>
  );
}
