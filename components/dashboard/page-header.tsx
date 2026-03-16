"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Download, ChevronDown, type LucideIcon } from "lucide-react";

export interface DateRangeOption {
  label: string;
  value: string;
}

export interface ActionButton {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  dateRangeOptions?: DateRangeOption[];
  selectedDateRange?: string;
  onDateRangeChange?: (value: string) => void;
  actions?: ActionButton[];
  className?: string;
  children?: React.ReactNode;
}

const defaultDateRangeOptions: DateRangeOption[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "This Year", value: "1y" },
];

export function PageHeader({
  title,
  description,
  dateRangeOptions = defaultDateRangeOptions,
  selectedDateRange = "30d",
  onDateRangeChange,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const selectedOption = dateRangeOptions.find((o) => o.value === selectedDateRange);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
        className
      )}
    >
      <div>
        <h1 className="text-2xl lg:text-3xl tracking-tight font-normal mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-sm font-light text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {children}

        {dateRangeOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none justify-between sm:justify-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  {selectedOption?.label || "Select Range"}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dateRangeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onDateRangeChange?.(option.value)}
                  className={cn(
                    selectedDateRange === option.value && "bg-accent"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {actions?.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || "default"}
              onClick={action.onClick}
              className={cn(
                "flex-1 sm:flex-none gap-2",
                action.variant === "default" &&
                  "shadow-[0_0_20px_rgba(220,218,203,0.15)]"
              )}
            >
              {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Default export action
export const exportAction: ActionButton = {
  label: "Export",
  icon: Download,
  variant: "default",
};
