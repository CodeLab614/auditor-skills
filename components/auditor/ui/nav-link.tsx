import Link from "next/link";
import type { HTMLAttributeAnchorTarget, MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HoverCorners } from "./corner-box";

type SharedProps = {
  children: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  count?: ReactNode;
  className?: string;
  expanded?: boolean;
  sectionId?: string;
  bareChildren?: boolean;
};

type LinkProps = SharedProps & {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
  type?: never;
};

type ButtonProps = SharedProps & {
  href?: never;
  onClick: () => void;
  type?: "button" | "submit";
};

function isLinkProps(props: LinkProps | ButtonProps): props is LinkProps {
  return typeof props.href === "string";
}

export function NavLink(props: LinkProps | ButtonProps) {
  const { children, active = false, icon, count, className, expanded, sectionId, bareChildren } = props;
  const classNames = cn("auditor-nav-link", active && "is-active", className);
  const content = (
    <>
      {icon}
      {bareChildren ? children : <span className="auditor-nav-link__label">{children}</span>}
      {count !== undefined && <span className="auditor-nav-link__count">{count}</span>}
      <HoverCorners />
    </>
  );

  if (isLinkProps(props)) {
    return (
      <Link
        href={props.href}
        className={classNames}
        onClick={props.onClick}
        target={props.target}
        rel={props.rel}
        aria-current={active
          ? props.href.startsWith("#") ? "location" : "page"
          : undefined}
        data-section={sectionId}
      >
        {content}
      </Link>
    );
  }

  return (
    <Button
      type={props.type ?? "button"}
      onClick={props.onClick}
      variant="ghost"
      className={cn(classNames, "h-auto w-full justify-start rounded-none p-0 shadow-none")}
      aria-pressed={active}
      aria-expanded={expanded}
    >
      {content}
    </Button>
  );
}
