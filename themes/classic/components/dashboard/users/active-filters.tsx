'use client';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { type Filters, USER_STATUS_MAP } from './types';
import { PROVIDER_CONFIG } from './provider-icons';

interface ActiveFiltersProps {
  filters: Filters;
  onRemoveFilter: (type: 'role' | 'status' | 'provider', value: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const hasFilters =
    filters.roles.length > 0 ||
    filters.statuses.length > 0 ||
    filters.providers.length > 0;

  if (!hasFilters) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-xs text-muted-foreground'>Active filters:</span>

      {filters.roles.map((role) => (
        <Badge
          key={`role-${role}`}
          variant='secondary'
          className='gap-1 capitalize cursor-pointer hover:bg-secondary/80'
          onClick={() => onRemoveFilter('role', role)}
        >
          {role}
          <X className='h-3 w-3' />
        </Badge>
      ))}

      {filters.statuses.map((status) => (
        <Badge
          key={`status-${status}`}
          variant='secondary'
          className='gap-1 capitalize cursor-pointer hover:bg-secondary/80'
          onClick={() => onRemoveFilter('status', status)}
        >
          {USER_STATUS_MAP[status]?.label || status}
          <X className='h-3 w-3' />
        </Badge>
      ))}

      {filters.providers.map((provider) => (
        <Badge
          key={`provider-${provider}`}
          variant='secondary'
          className='gap-1 cursor-pointer hover:bg-secondary/80'
          onClick={() => onRemoveFilter('provider', provider)}
        >
          {PROVIDER_CONFIG[provider]?.label || provider}
          <X className='h-3 w-3' />
        </Badge>
      ))}

      <button
        onClick={onClearAll}
        className='text-xs text-muted-foreground hover:text-foreground ml-2'
      >
        Clear all
      </button>
    </div>
  );
}
