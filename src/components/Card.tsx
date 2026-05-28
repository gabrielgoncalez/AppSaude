import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-lg border border-slate-800 bg-slate-950/76 p-4 shadow-lift ${className}`}
    >
      {children}
    </section>
  );
}
