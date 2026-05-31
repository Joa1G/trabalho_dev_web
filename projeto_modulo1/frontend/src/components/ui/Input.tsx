import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const baseInput =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 " +
  "text-sm placeholder:text-gray-400 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary " +
  "disabled:bg-gray-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      aria-invalid={!!error || undefined}
      className={`${baseInput} ${error ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : ""} ${className}`}
    />
  ),
);
Input.displayName = "Input";
