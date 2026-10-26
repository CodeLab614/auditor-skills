import * as React from "react";
import { cn } from "@/lib/utils";

export const textBodyMRegularClassName =
  `text-center font-sans text-[15px] font-normal leading-[150%] tracking-[-0.075px]
  text-[var(--auditor-secondary,var(--muted-foreground))]`;
export const textBodySRegularClassName =
  `text-center font-sans text-[14px] font-[430] leading-[150%] tracking-[-0.26px]
  text-[var(--auditor-secondary,var(--muted-foreground))]`;
export const textBodyXsMonoRegularClassName =
  `text-center font-mono text-[10px] font-normal tracking-[-0.2px]
  text-[var(--auditor-secondary,var(--muted-foreground))]
  underline decoration-solid`;

const sizes = {
  m: textBodyMRegularClassName,
  s: textBodySRegularClassName,
  xs: textBodyXsMonoRegularClassName,
};

export type TextProps<T extends React.ElementType = "p"> =
  React.ComponentPropsWithoutRef<T> & {
    size?: "m" | "s" | "xs";
    as?: T;
  };

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, size = "m", as: Component = "p", ...props }, ref) => (
    <Component
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={cn(sizes[size], className)}
      {...props}
    />
  ),
);
Text.displayName = "AuditorText";
