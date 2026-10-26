"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  `auditor-button inline-flex min-w-0 items-center justify-center gap-[6px]
  relative rounded-[2px] border font-sans font-medium leading-[150%]
  tracking-[-0.01em] transition-colors focus-visible:outline-none
  disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none
  [&_svg]:size-[14px] [&_svg]:shrink-0 shadow-none hover:shadow-none`,
  {
    variants: {
      variant: {
        primary:
          `border-[#222220] bg-[#222220] text-[#f6f6f3]
          hover:bg-[#3d3d38] hover:border-[#3d3d38]`,
        secondary:
          `border-[var(--line-structure)] bg-[var(--surface-bg)]
          text-[var(--text-primary)] hover:border-[var(--line-cta)]
          hover:bg-[var(--surface-1)]`,
        text:
          `border-transparent bg-transparent text-[var(--text-primary)]
          shadow-none hover:bg-[var(--surface-1)]`,
      },
      size: {
        sm: "h-7 px-3 text-[12px]",
        default: "h-[34px] px-[14px] text-[13px]",
        lg: "h-10 px-[18px] text-[14px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type Variant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type Size = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | "outline" | "ghost" | "link" | "destructive";
  size?: Size | "small";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant =
      variant === "outline"
        ? "secondary"
        : variant === "ghost" || variant === "link"
          ? "text"
          : variant === "destructive"
            ? "primary"
            : variant;
    const resolvedSize = size === "small" ? "sm" : size;
    const classes = cn(buttonVariants({
      variant: resolvedVariant,
      size: resolvedSize,
      className,
    }));
    return (
      <ShadcnButton
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        variant="ghost"
        size="sm"
        asChild={asChild}
        data-slot="auditor-button"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        {...props}
      >
        {children}
      </ShadcnButton>
    );
  },
);
Button.displayName = "AuditorButton";

export { buttonVariants };
