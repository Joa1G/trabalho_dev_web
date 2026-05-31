import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "destructive" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center rounded-md text-sm font-semibold " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
  "h-10 px-4 py-2";

const styles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover focus-visible:ring-primary",
  destructive:
    "bg-destructive text-destructive-fg hover:bg-destructive-hover focus-visible:ring-destructive",
  ghost: "bg-transparent text-ifam-preto hover:bg-gray-100",
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {loading ? "Carregando..." : children}
    </button>
  );
}
