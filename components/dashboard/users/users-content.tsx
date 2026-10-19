'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import type { User } from '@/actions/users';
import { useUsersFilters, useUserDialogs, useUserActions } from './hooks';
import { SearchAndFilters } from './search-and-filters';
import { ActiveFilters } from './active-filters';
import { UsersTable } from './users-table';
import { BulkActionsBar } from './bulk-actions-bar';
import { AddUserDialog } from './add-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { ChangeRoleDialog } from './change-role-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';

interface UsersContentProps {
  users: User[];
  isAdmin?: boolean;
  currentUserId: string;
}

export function UsersContent({
  users,
  isAdmin = true,
  currentUserId,
}: UsersContentProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredUsers,
    activeFilterCount,
    removeFilter,
    clearAllFilters,
  } = useUsersFilters(users);

  const {
    selectedUser,
    bulkRole,
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    roleDialogOpen,
    setRoleDialogOpen,
    resetPasswordDialogOpen,
    setResetPasswordDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    statusDialogOpen,
    setStatusDialogOpen,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkActivateDialogOpen,
    setBulkActivateDialogOpen,
    bulkDeactivateDialogOpen,
    setBulkDeactivateDialogOpen,
    bulkRoleDialogOpen,
    setBulkRoleDialogOpen,
    openAddDialog,
    openEditDialog,
    openRoleDialog,
    openResetPasswordDialog,
    openStatusDialog,
    openDeleteDialog,
    openBulkRoleDialog,
    openBulkActivateDialog,
    openBulkDeactivateDialog,
    openBulkDeleteDialog,
  } = useUserDialogs();

  const {
    handleToggleStatus,
    handleDeleteUser,
    handleBulkActivate,
    handleBulkDeactivate,
    handleBulkChangeRole,
    handleBulkDelete,
  } = useUserActions({
    selectedUser,
    selectedIds,
    bulkRole,
    onClearSelection: () => setSelectedIds([]),
    onCloseBulkActivateDialog: () => setBulkActivateDialogOpen(false),
    onCloseBulkDeactivateDialog: () => setBulkDeactivateDialogOpen(false),
    onCloseBulkRoleDialog: () => setBulkRoleDialogOpen(false),
    onCloseBulkDeleteDialog: () => setBulkDeleteDialogOpen(false),
  });

  return (
    <>
      <PageHeader
        title='Users'
        description='Manage your platform users.'
        dateRangeOptions={[]}
      >
        {isAdmin && (
          <Button onClick={openAddDialog} className='gap-2'>
            <UserPlus className='h-4 w-4' strokeWidth={1.5} />
            Add User
          </Button>
        )}
      </PageHeader>

      <div className='dark:border dark:border-border bg-card'>
        <div className='p-4 dark:border-b dark:border-border space-y-3'>
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />

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

        <UsersTable
          users={filteredUsers}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          onChangeRole={openRoleDialog}
          onResetPassword={openResetPasswordDialog}
          onToggleStatus={openStatusDialog}
        />
      </div>

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkActivate={openBulkActivateDialog}
          onBulkDeactivate={openBulkDeactivateDialog}
          onBulkChangeRole={openBulkRoleDialog}
          onBulkDelete={openBulkDeleteDialog}
          isAdmin={isAdmin}
        />
      )}

      {/* Dialogs */}
      {isAdmin && (
        <AddUserDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      )}

      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {isAdmin && (
        <ChangeRoleDialog
          user={selectedUser}
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
        />
      )}

      <ResetPasswordDialog
        user={selectedUser}
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      />

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={selectedUser?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        description={
          selectedUser?.status === 'active'
            ? `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the platform.`
            : `Are you sure you want to activate ${selectedUser?.name}? They will regain access to the platform.`
        }
        confirmLabel={selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={selectedUser?.status === 'active' ? 'destructive' : 'default'}
        onConfirm={handleToggleStatus}
      />

      {isAdmin && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title='Delete User'
          description={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone.`}
          confirmLabel='Delete'
          variant='destructive'
          onConfirm={handleDeleteUser}
        />
      )}

      <ConfirmDialog
        open={bulkActivateDialogOpen}
        onOpenChange={setBulkActivateDialogOpen}
        title='Activate Users'
        description={`Are you sure you want to activate ${selectedIds.length} users?`}
        confirmLabel='Activate All'
        variant='default'
        onConfirm={handleBulkActivate}
      />

      <ConfirmDialog
        open={bulkDeactivateDialogOpen}
        onOpenChange={setBulkDeactivateDialogOpen}
        title='Deactivate Users'
        description={`Are you sure you want to deactivate ${selectedIds.length} users?`}
        confirmLabel='Deactivate All'
        variant='destructive'
        onConfirm={handleBulkDeactivate}
      />

      <ConfirmDialog
        open={bulkRoleDialogOpen}
        onOpenChange={setBulkRoleDialogOpen}
        title='Change Role'
        description={`Are you sure you want to change the role of ${selectedIds.length} users to "${bulkRole}"?`}
        confirmLabel='Change Role'
        variant='default'
        onConfirm={handleBulkChangeRole}
      />

      {isAdmin && (
        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title='Delete Users'
          description={`Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone.`}
          confirmLabel='Delete All'
          variant='destructive'
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  );
}
