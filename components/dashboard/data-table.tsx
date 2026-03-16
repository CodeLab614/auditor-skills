"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T extends { id: string }> {
  title?: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  viewAllHref?: string;
  viewAllLabel?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  embedded?: boolean;
}

export function DataTable<T extends { id: string }>({
  title,
  description,
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  viewAllHref,
  viewAllLabel = "View All",
  onRowClick,
  className,
  embedded = false,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(data.map((item) => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const tableContent = (
    <ScrollArea className="w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="border-b border-border bg-background/50 hover:bg-background/50">
              {selectable && (
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={allSelected}
                    ref={(ref) => {
                      if (ref) {
                        (ref as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    className="border-accent data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "text-xs text-muted-foreground uppercase tracking-widest font-normal",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, rowIndex) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "border-b border-border hover:bg-accent/50 transition-colors cursor-pointer group",
                    rowIndex === data.length - 1 && "border-b-0"
                  )}
                >
                  {selectable && (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectRow(item.id, checked as boolean)
                        }
                        className="border-accent group-hover:border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn("text-sm font-light", column.className)}
                    >
                      {column.render
                        ? column.render(item, rowIndex)
                        : (item as Record<string, unknown>)[column.key] as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
  );

  if (embedded) {
    return tableContent;
  }

  return (
    <Card className={cn("overflow-hidden flex flex-col", className)}>
      {title && (
        <div className="p-5 sm:p-6 dark:border-b dark:border-border flex justify-between items-center">
          <div>
            <h2 className="text-base font-normal tracking-tight mb-1">{title}</h2>
            {description && (
              <span className="text-xs text-muted-foreground font-light">
                {description}
              </span>
            )}
          </div>
          {viewAllHref && (
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link href={viewAllHref}>{viewAllLabel}</Link>
            </Button>
          )}
        </div>
      )}
      {tableContent}
    </Card>
  );
}
