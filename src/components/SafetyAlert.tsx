import { AlertTriangle, Info } from "lucide-react";
import type { SafetyAlert as SafetyAlertType } from "../lib/safety";

type SafetyAlertProps = {
  alert: SafetyAlertType;
};

export function SafetyAlert({ alert }: SafetyAlertProps) {
  const isWarning = alert.level !== "info";

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        isWarning
          ? "border-rose-400/35 bg-rose-500/10 text-rose-100"
          : "border-teal-400/30 bg-teal-400/10 text-teal-100"
      }`}
    >
      <div className="mb-1 flex items-center gap-2 font-bold">
        {isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
        <span>{alert.title}</span>
      </div>
      <p className="leading-relaxed text-slate-200">{alert.message}</p>
    </div>
  );
}
