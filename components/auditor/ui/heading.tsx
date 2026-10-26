import * as React from "react";
import { cn } from "@/lib/utils";

export type HeadingSize = "big" | "large" | "normal" | "small";
export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
  size?: HeadingSize;
}

const sizes: Record<HeadingSize, string> = {
  big: "text-[44px] leading-[105%] max-[390px]:text-[35px] md:text-[54px] xl:text-[68px]",
  large: "text-[32px] leading-none sm:text-[44px] md:text-[50px]",
  normal: "text-[32px] leading-[115%]",
  small: "text-[15px] leading-[115%]",
};

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Tag = "h2", size = "normal", className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        "font-sans font-medium not-italic tracking-[-0.035em] text-[var(--auditor-text,var(--foreground))]",
        size === "big" && "text-center",
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Heading.displayName = "AuditorHeading";
