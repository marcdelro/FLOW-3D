import { Link } from "react-router-dom";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d12] focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed";

const sizes = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
} as const;

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-gray-900 hover:bg-gray-100 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_30px_-10px_rgba(59,130,246,0.5)]",
  secondary:
    "bg-white/[0.06] text-gray-100 border border-white/15 hover:bg-white/[0.1] hover:border-white/25 backdrop-blur",
  ghost:
    "bg-transparent text-gray-200 hover:bg-white/[0.06] hover:text-white",
};

type CommonProps = {
  variant?: Variant;
  size?: keyof typeof sizes;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className = "",
  children,
  external,
  onClick,
}: CommonProps & { to: string; external?: boolean; onClick?: () => void }) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (external || to.startsWith("#") || to.startsWith("http")) {
    return (
      <a href={to} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} onClick={onClick}>
      {children}
    </Link>
  );
}
