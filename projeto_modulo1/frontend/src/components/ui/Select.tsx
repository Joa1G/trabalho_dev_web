import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const baseSelect =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 " +
  "text-sm focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary focus-visible:border-primary " +
  "disabled:bg-gray-50 disabled:cursor-not-allowed";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, ...rest }, ref) => (
    <select
      ref={ref}
      {...rest}
      aria-invalid={!!error || undefined}
      className={`${baseSelect} ${error ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : ""} ${className}`}
    />
  ),
);
Select.displayName = "Select";
