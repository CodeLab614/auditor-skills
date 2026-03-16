'use client';

import * as React from 'react';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type Column,
  type StatusType,
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Mail,
  Ban,
  UserCheck,
  KeyRound,
  X,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { AddUserDialog, type NewUserData } from './add-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { ChangeRoleDialog } from './change-role-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { ConfirmDialog } from './confirm-dialog';

// Provider icons as simple components
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
      <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
      <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
      <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
      <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
      <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
    </svg>
  );
}

export type AuthProvider = 'email' | 'google' | 'github';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: AuthProvider;
  createdAt: string;
  lastActive: string;
}

interface Filters {
  roles: string[];
  statuses: string[];
  providers: AuthProvider[];
}

const userStatusMap: Record<string, { status: StatusType; label: string }> = {
  active: { status: 'success', label: 'Active' },
  pending: { status: 'warning', label: 'Pending' },
  inactive: { status: 'error', label: 'Inactive' },
};

const roleColors: Record<string, string> = {
  admin: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  moderator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  user: 'text-muted-foreground bg-muted border-border',
};

const providerConfig: Record<
  AuthProvider,
  { icon: React.ElementType; label: string; color: string }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-muted-foreground',
  },
  google: {
    icon: GoogleIcon,
    label: 'Google',
    color: 'text-red-400',
  },
  github: {
    icon: GitHubIcon,
    label: 'GitHub',
    color: 'text-foreground',
  },
};

// Search and Filters Component
interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  activeFilterCount: number;
}

function SearchAndFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  activeFilterCount,
}: SearchAndFiltersProps) {
  const toggleRole = (role: string) => {
    const newRoles = filters.roles.includes(role)
      ? filters.roles.filter((r) => r !== role)
      : [...filters.roles, role];
    onFiltersChange({ ...filters, roles: newRoles });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleProvider = (provider: AuthProvider) => {
    const newProviders = filters.providers.includes(provider)
      ? filters.providers.filter((p) => p !== provider)
      : [...filters.providers, provider];
    onFiltersChange({ ...filters, providers: newProviders });
  };

  const clearFilters = () => {
    onFiltersChange({ roles: [], statuses: [], providers: [] });
  };

  return (
    <div className='flex flex-col sm:flex-row gap-3'>
      {/* Search Input */}
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search by name or email...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-9 bg-background border-border'
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline' className='gap-2 shrink-0'>
            <SlidersHorizontal className='h-4 w-4' />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant='secondary'
                className='ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]'
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-80 p-0 bg-card border-border'>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
            <h4 className='text-sm font-medium'>Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className='text-xs text-primary hover:text-primary/80 font-medium'
              >
                Clear all
              </button>
            )}
          </div>

          <div className='p-4 space-y-5'>
            {/* Role Filter */}
            <div className='space-y-3'>
              <label className='text-xs text-muted-foreground uppercase tracking-wider font-medium'>
                Role
              </label>
              <div className='flex flex-wrap gap-2'>
                {['admin', 'moderator', 'user'].map((role) => (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 text-xs border capitalize transition-colors ${
                      filters.roles.includes(role)
                        ? roleColors[role]
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className='space-y-3'>
              <label className='text-xs text-muted-foreground uppercase tracking-wider font-medium'>
                Status
              </label>
              <div className='flex flex-wrap gap-2'>
                {Object.entries(userStatusMap).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => toggleStatus(key)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      filters.statuses.includes(key)
                        ? key === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : key === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Filter */}
            <div className='space-y-3'>
              <label className='text-xs text-muted-foreground uppercase tracking-wider font-medium'>
                Auth Provider
              </label>
              <div className='flex flex-wrap gap-2'>
                {(Object.keys(providerConfig) as AuthProvider[]).map((provider) => {
                  const config = providerConfig[provider];
                  const Icon = config.icon;
                  return (
                    <button
                      key={provider}
                      onClick={() => toggleProvider(provider)}
                      className={`px-3 py-1.5 text-xs border transition-colors flex items-center gap-2 ${
                        filters.providers.includes(provider)
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className='h-3.5 w-3.5' />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Active Filters Display
interface ActiveFiltersProps {
  filters: Filters;
  onRemoveFilter: (type: 'role' | 'status' | 'provider', value: string) => void;
  onClearAll: () => void;
}

function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
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
          {userStatusMap[status]?.label || status}
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
          {providerConfig[provider]?.label || provider}
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

interface UserActionsProps {
  user: User;
  isAdmin: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onChangeRole: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

function UserActions({
  user,
  isAdmin,
  onEdit,
  onDelete,
  onChangeRole,
  onResetPassword,
  onToggleStatus,
}: UserActionsProps) {
  const isOAuthUser = user.provider !== 'email';
  const isActive = user.status === 'active';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8'>
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48 bg-card border-border'>
        <DropdownMenuLabel className='font-normal text-muted-foreground'>
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='bg-border' />

        {!isOAuthUser && (
          <DropdownMenuItem
            onClick={() => onEdit(user)}
            className='cursor-pointer'
          >
            <Pencil className='mr-2 h-4 w-4' />
            Edit User
          </DropdownMenuItem>
        )}

        {isOAuthUser && (
          <DropdownMenuItem disabled className='cursor-not-allowed opacity-50'>
            <Pencil className='mr-2 h-4 w-4' />
            Edit User
            <span className='ml-auto text-[10px] text-muted-foreground'>
              OAuth
            </span>
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <DropdownMenuItem
            onClick={() => onChangeRole(user)}
            className='cursor-pointer'
          >
            <Shield className='mr-2 h-4 w-4' />
            Change Role
          </DropdownMenuItem>
        )}

        {!isOAuthUser && (
          <DropdownMenuItem
            onClick={() => onResetPassword(user)}
            className='cursor-pointer'
          >
            <KeyRound className='mr-2 h-4 w-4' />
            Reset Password
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className='bg-border' />

        <DropdownMenuItem
          onClick={() => onToggleStatus(user)}
          className='cursor-pointer'
        >
          {isActive ? (
            <>
              <Ban className='mr-2 h-4 w-4' />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className='mr-2 h-4 w-4' />
              Activate
            </>
          )}
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator className='bg-border' />
            <DropdownMenuItem
              onClick={() => onDelete(user)}
              className='cursor-pointer text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Bulk Actions Bar Component
interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkChangeRole: (role: string) => void;
  onBulkDelete: () => void;
  isAdmin: boolean;
}

function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkChangeRole,
  onBulkDelete,
  isAdmin,
}: BulkActionsBarProps) {
  return (
    <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200'>
      <div className='flex items-center gap-2 bg-card border border-border rounded-lg shadow-lg px-4 py-3'>
        <div className='flex items-center gap-3 pr-3 border-r border-border'>
          <span className='text-sm font-medium'>
            {selectedCount} selected
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={onClearSelection}
          >
            <X className='h-4 w-4' />
          </Button>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onBulkActivate}
            className='gap-2'
          >
            <UserCheck className='h-4 w-4' />
            Activate
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onBulkDeactivate}
            className='gap-2'
          >
            <Ban className='h-4 w-4' />
            Deactivate
          </Button>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='gap-2'>
                  <Shield className='h-4 w-4' />
                  Change Role
                  <ChevronDown className='h-3 w-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='bg-card border-border'>
                <DropdownMenuItem onClick={() => onBulkChangeRole('admin')}>
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkChangeRole('moderator')}>
                  Moderator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkChangeRole('user')}>
                  User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isAdmin && (
            <Button
              variant='outline'
              size='sm'
              onClick={onBulkDelete}
              className='gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10'
            >
              <Trash2 className='h-4 w-4' />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface UsersContentProps {
  users: User[];
  isAdmin?: boolean;
}

export function UsersContent({ users: initialUsers, isAdmin = true }: UsersContentProps) {
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Filters>({
    roles: [],
    statuses: [],
    providers: [],
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);

  // Bulk action dialog states
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [bulkActivateDialogOpen, setBulkActivateDialogOpen] = React.useState(false);
  const [bulkDeactivateDialogOpen, setBulkDeactivateDialogOpen] = React.useState(false);
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = React.useState(false);
  const [bulkRole, setBulkRole] = React.useState<string>('user');

  // Selected user for actions
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Filter users based on search and filters
  const filteredUsers = React.useMemo(() => {
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
  }, [users, searchQuery, filters]);

  // Count active filters
  const activeFilterCount =
    filters.roles.length + filters.statuses.length + filters.providers.length;

  // Remove single filter
  const removeFilter = (type: 'role' | 'status' | 'provider', value: string) => {
    if (type === 'role') {
      setFilters((prev) => ({
        ...prev,
        roles: prev.roles.filter((r) => r !== value),
      }));
    } else if (type === 'status') {
      setFilters((prev) => ({
        ...prev,
        statuses: prev.statuses.filter((s) => s !== value),
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        providers: prev.providers.filter((p) => p !== value),
      }));
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({ roles: [], statuses: [], providers: [] });
    setSearchQuery('');
  };

  // Action handlers
  const handleAddUser = async (data: NewUserData) => {
    const newUser: User = {
      id: String(Date.now()),
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'pending',
      provider: 'email',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      lastActive: 'Never',
    };
    setUsers((prev) => [newUser, ...prev]);
  };

  const handleEditUser = async (
    user: User,
    data: { name: string; email: string }
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, name: data.name, email: data.email } : u
      )
    );
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );
  };

  const handleResetPassword = async (user: User, method: string) => {
    console.log(`Password reset for ${user.email} using method: ${method}`);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, status: newStatus } : u))
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
  };

  // Bulk action handlers
  const handleBulkActivate = async () => {
    setUsers((prev) =>
      prev.map((u) =>
        selectedIds.includes(u.id) ? { ...u, status: 'active' } : u
      )
    );
    setSelectedIds([]);
    setBulkActivateDialogOpen(false);
  };

  const handleBulkDeactivate = async () => {
    setUsers((prev) =>
      prev.map((u) =>
        selectedIds.includes(u.id) ? { ...u, status: 'inactive' } : u
      )
    );
    setSelectedIds([]);
    setBulkDeactivateDialogOpen(false);
  };

  const handleBulkChangeRole = async () => {
    setUsers((prev) =>
      prev.map((u) =>
        selectedIds.includes(u.id) ? { ...u, role: bulkRole } : u
      )
    );
    setSelectedIds([]);
    setBulkRoleDialogOpen(false);
  };

  const handleBulkDelete = async () => {
    setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
    setSelectedIds([]);
    setBulkDeleteDialogOpen(false);
  };

  const openBulkRoleDialog = (role: string) => {
    setBulkRole(role);
    setBulkRoleDialogOpen(true);
  };

  // Open dialog handlers
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const openStatusDialog = (user: User) => {
    setSelectedUser(user);
    setStatusDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (item) => {
        const provider = providerConfig[item.provider];
        const ProviderIcon = provider.icon;
        return (
          <div className='flex items-center gap-3'>
            <div className='flex flex-col'>
              <div className='flex items-center gap-2'>
                <span className='font-medium text-foreground'>{item.name}</span>
                <span
                  className={`${provider.color}`}
                  title={`Signed in with ${provider.label}`}
                >
                  <ProviderIcon className='h-3.5 w-3.5' />
                </span>
              </div>
              <span className='text-xs text-muted-foreground'>{item.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (item) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-normal border capitalize ${
            roleColors[item.role] || roleColors.user
          }`}
        >
          {item.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const config = userStatusMap[item.status] || {
          status: 'neutral' as StatusType,
          label: item.status,
        };
        return <StatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (item) => (
        <span className='text-muted-foreground'>{item.createdAt}</span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (item) => (
        <span className='text-muted-foreground'>{item.lastActive}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <UserActions
          user={item}
          isAdmin={isAdmin}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onChangeRole={openRoleDialog}
          onResetPassword={openResetPasswordDialog}
          onToggleStatus={openStatusDialog}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='Users'
        description='Manage your platform users.'
        dateRangeOptions={[]}
      >
        {isAdmin && (
          <Button onClick={() => setAddDialogOpen(true)} className='gap-2'>
            <UserPlus className='h-4 w-4' strokeWidth={1.5} />
            Add User
          </Button>
        )}
      </PageHeader>

      {/* Search, Filters, and Table in one card */}
      <div className='dark:border dark:border-border bg-card'>
        {/* Search and Filters Bar */}
        <div className='p-4 dark:border-b dark:border-border space-y-3'>
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Active Filters and Results Count */}
          {(searchQuery || activeFilterCount > 0) && (
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <ActiveFilters
                filters={filters}
                onRemoveFilter={removeFilter}
                onClearAll={clearAllFilters}
              />
              <p className='text-sm text-muted-foreground'>
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          )}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          embedded
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkActivate={() => setBulkActivateDialogOpen(true)}
          onBulkDeactivate={() => setBulkDeactivateDialogOpen(true)}
          onBulkChangeRole={openBulkRoleDialog}
          onBulkDelete={() => setBulkDeleteDialogOpen(true)}
          isAdmin={isAdmin}
        />
      )}

      {/* Add User Dialog */}
      {isAdmin && (
        <AddUserDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddUser}
        />
      )}

      {/* Edit User Dialog */}
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditUser}
      />

      {/* Change Role Dialog */}
      {isAdmin && (
        <ChangeRoleDialog
          user={selectedUser}
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onSubmit={handleChangeRole}
        />
      )}

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        user={selectedUser}
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        onSubmit={handleResetPassword}
      />

      {/* Toggle Status Confirmation */}
      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={
          selectedUser?.status === 'active'
            ? 'Deactivate User'
            : 'Activate User'
        }
        description={
          selectedUser?.status === 'active'
            ? `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the platform.`
            : `Are you sure you want to activate ${selectedUser?.name}? They will regain access to the platform.`
        }
        confirmLabel={selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={selectedUser?.status === 'active' ? 'destructive' : 'default'}
        onConfirm={handleToggleStatus}
      />

      {/* Delete User Confirmation */}
      {isAdmin && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title='Delete User'
          description={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone and all user data will be permanently removed.`}
          confirmLabel='Delete'
          variant='destructive'
          onConfirm={handleDeleteUser}
        />
      )}

      {/* Bulk Activate Confirmation */}
      <ConfirmDialog
        open={bulkActivateDialogOpen}
        onOpenChange={setBulkActivateDialogOpen}
        title='Activate Users'
        description={`Are you sure you want to activate ${selectedIds.length} users? They will regain access to the platform.`}
        confirmLabel='Activate All'
        variant='default'
        onConfirm={handleBulkActivate}
      />

      {/* Bulk Deactivate Confirmation */}
      <ConfirmDialog
        open={bulkDeactivateDialogOpen}
        onOpenChange={setBulkDeactivateDialogOpen}
        title='Deactivate Users'
        description={`Are you sure you want to deactivate ${selectedIds.length} users? They will no longer be able to access the platform.`}
        confirmLabel='Deactivate All'
        variant='destructive'
        onConfirm={handleBulkDeactivate}
      />

      {/* Bulk Change Role Confirmation */}
      <ConfirmDialog
        open={bulkRoleDialogOpen}
        onOpenChange={setBulkRoleDialogOpen}
        title='Change Role'
        description={`Are you sure you want to change the role of ${selectedIds.length} users to "${bulkRole}"?`}
        confirmLabel='Change Role'
        variant='default'
        onConfirm={handleBulkChangeRole}
      />

      {/* Bulk Delete Confirmation */}
      {isAdmin && (
        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title='Delete Users'
          description={`Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone and all user data will be permanently removed.`}
          confirmLabel='Delete All'
          variant='destructive'
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  );
}
