import type { LabelHTMLAttributes } from "react";

export function Label({
  className = "",
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={`text-sm font-medium text-ifam-preto ${className}`}
    />
  );
}
