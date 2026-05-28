import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-pulse text-slate-950 hover:bg-teal-300",
  secondary: "bg-slate-800 text-slate-50 hover:bg-slate-700",
  ghost: "bg-transparent text-slate-200 hover:bg-slate-800",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
};

export function Button({
  children,
  icon,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`tap-target inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      type="button"
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
