import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "teal" | "orange" | "rose" | "slate";
};

const tones = {
  teal: "border-teal-400/30 bg-teal-400/10 text-teal-200",
  orange: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  slate: "border-slate-700 bg-slate-900 text-slate-100",
};

export function StatCard({ label, value, icon, tone = "slate" }: StatCardProps) {
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-xl font-black text-slate-50">{value}</div>
    </div>
  );
}
