import type { Filters } from '../types';
import type { User } from '@/actions/users';

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

export const filterUsers = (
  users: User[],
  searchQuery: string,
  filters: Filters
): User[] => {
  return users.filter((user) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Role filter
    if (filters.roles.length > 0 && !filters.roles.includes(user.role)) {
      return false;
    }

    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(user.status)) {
      return false;
    }

    // Provider filter
    if (filters.providers.length > 0 && !filters.providers.includes(user.provider)) {
      return false;
    }

    return true;
  });
};
