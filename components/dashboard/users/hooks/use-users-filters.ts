import { useState, useMemo, useCallback } from 'react';
import type { Filters } from '../types';
import type { User } from '@/actions/users';
import {
  createEmptyFilters,
  removeFilter as removeFilterHelper,
  getActiveFilterCount,
  filterUsers,
} from '../helpers';

export function useUsersFilters(users: User[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(createEmptyFilters);

  const filteredUsers = useMemo(
    () => filterUsers(users, searchQuery, filters),
    [users, searchQuery, filters]
  );

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters]
  );

  const removeFilter = useCallback(
    (type: 'role' | 'status' | 'provider', value: string) => {
      setFilters((prev) => removeFilterHelper(prev, type, value));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters(createEmptyFilters());
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredUsers,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  };
}
