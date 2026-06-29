import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-cyan text-ink hover:bg-mint shadow-glow",
  secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
  danger: "bg-rose-500/16 text-rose-100 border border-rose-400/30 hover:bg-rose-500/24",
  ghost: "bg-transparent text-white/75 hover:text-white hover:bg-white/10"
};

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
