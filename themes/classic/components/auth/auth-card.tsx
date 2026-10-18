"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <Card className="gap-y-0 p-6">{children}</Card>

      {footer && (
        <div className="text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

interface AuthLinkProps {
  href: string;
  children: React.ReactNode;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
}

export function AuthLink({ href, children, target, rel }: AuthLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className="text-foreground underline-offset-4 hover:underline font-medium"
    >
      {children}
    </Link>
  );
}
