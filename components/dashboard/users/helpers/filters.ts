import type { Filters } from '../types';

export const createEmptyFilters = (): Filters => ({
  roles: [],
  statuses: [],
  providers: [],
});

export const removeRoleFilter = (filters: Filters, role: string): Filters => ({
  ...filters,
  roles: filters.roles.filter((r) => r !== role),
});

export const removeStatusFilter = (filters: Filters, status: string): Filters => ({
  ...filters,
  statuses: filters.statuses.filter((s) => s !== status),
});

export const removeProviderFilter = (filters: Filters, provider: string): Filters => ({
  ...filters,
  providers: filters.providers.filter((p) => p !== provider),
});

export const removeFilter = (
  filters: Filters,
  type: 'role' | 'status' | 'provider',
  value: string
): Filters => {
  switch (type) {
    case 'role':
      return removeRoleFilter(filters, value);
    case 'status':
      return removeStatusFilter(filters, value);
    case 'provider':
      return removeProviderFilter(filters, value);
  }
};

export const getActiveFilterCount = (filters: Filters): number =>
  filters.roles.length + filters.statuses.length + filters.providers.length;
