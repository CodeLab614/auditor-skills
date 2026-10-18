import type { AuthProvider } from '@/actions/users';
import type { StatusType } from '@/components/dashboard';

export interface Filters {
  roles: string[];
  statuses: string[];
  providers: AuthProvider[];
}

export const USER_STATUS_MAP: Record<string, { status: StatusType; label: string }> = {
  active: { status: 'success', label: 'Active' },
  pending: { status: 'warning', label: 'Pending' },
  inactive: { status: 'error', label: 'Inactive' },
};

export const ROLE_COLORS: Record<string, string> = {
  admin: 'text-purple-400 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20',
  moderator: 'text-blue-400 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  user: 'text-muted-foreground bg-muted border-border',
};
