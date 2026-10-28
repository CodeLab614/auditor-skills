import type { HTMLAttributes } from "react";
import { getTableRange } from "@/lib/table-query";
import { formatCount } from "@/lib/auditor/labels";
import { MonoLabel } from "./mono-label";
import { NavLink } from "./nav-link";

export type PaginationItem = number | "ellipsis";

export function getVisiblePages(
  page: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  if (page - 1 >= 1) pages.add(page - 1);
  pages.add(page);
  if (page + 1 <= totalPages) pages.add(page + 1);

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  for (let i = 0; i < sortedPages.length; i++) {
    if (i > 0) {
      const diff = sortedPages[i] - sortedPages[i - 1];
      if (diff === 2) {
        items.push(sortedPages[i - 1] + 1);
      } else if (diff > 2) {
        items.push("ellipsis");
      }
    }
    items.push(sortedPages[i]);
  }

  return items;
}

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  getPageHref: (page: number) => string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  getPageHref,
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const range = getTableRange(page, pageSize, total);
  const rangeText = `${formatCount(range.from)}–${formatCount(range.to)} de ${formatCount(total)}`;

  const items = getVisiblePages(page, totalPages);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className={["auditor-pagination", className].filter(Boolean).join(" ")}
      {...props}
    >
      <MonoLabel className="auditor-pagination__range">{rangeText}</MonoLabel>

      <div className="auditor-pagination__controls">
        {hasPrev ? (
          <NavLink
            href={getPageHref(page - 1)}
            className="auditor-pagination__prev"
          >
            ← Anterior
          </NavLink>
        ) : (
          <span
            className="auditor-nav-link auditor-pagination__prev auditor-pagination__disabled"
            aria-disabled="true"
          >
            ← Anterior
          </span>
        )}

        <div className="auditor-pagination__pages">
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="auditor-pagination__ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <NavLink
                key={item}
                href={getPageHref(item)}
                active={item === page}
                className="auditor-pagination__page"
              >
                {item}
              </NavLink>
            ),
          )}
        </div>

        <span className="auditor-pagination__mobile-indicator auditor-mono-label">
          · {formatCount(page)} / {formatCount(totalPages)} ·
        </span>

        {hasNext ? (
          <NavLink
            href={getPageHref(page + 1)}
            className="auditor-pagination__next"
          >
            Siguiente →
          </NavLink>
        ) : (
          <span
            className="auditor-nav-link auditor-pagination__next auditor-pagination__disabled"
            aria-disabled="true"
          >
            Siguiente →
          </span>
        )}
      </div>
    </nav>
  );
}
