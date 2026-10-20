'use client';

import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface UsersPaginationProps {
  page: number;
  totalPages: number;
  isPending: boolean;
  getPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
}

export function UsersPagination({
  page,
  totalPages,
  isPending,
  getPageHref,
  onPageChange,
}: UsersPaginationProps) {
  if (totalPages <= 1) return null;

  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const navigate =
    (targetPage: number, disabled: boolean) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (!disabled) onPageChange(targetPage);
    };

  return (
    <Pagination className="px-4 py-3" aria-busy={isPending}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={getPageHref(Math.max(1, page - 1))}
            aria-disabled={previousDisabled}
            tabIndex={previousDisabled ? -1 : undefined}
            className={cn(previousDisabled && 'pointer-events-none opacity-50')}
            onClick={navigate(page - 1, previousDisabled)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-3 text-sm text-muted-foreground" aria-live="polite">
            Page {page} of {totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href={getPageHref(Math.min(totalPages, page + 1))}
            aria-disabled={nextDisabled}
            tabIndex={nextDisabled ? -1 : undefined}
            className={cn(nextDisabled && 'pointer-events-none opacity-50')}
            onClick={navigate(page + 1, nextDisabled)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
