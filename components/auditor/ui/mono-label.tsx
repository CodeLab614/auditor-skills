import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function MonoLabel({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("auditor-mono-label", className)} {...props} />;
}
