import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-center">
      <p className="font-bold text-slate-100">{title}</p>
      {children ? <div className="mt-2 text-sm text-slate-400">{children}</div> : null}
    </div>
  );
}
