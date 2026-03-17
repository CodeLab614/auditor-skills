import { useState, useCallback } from 'react';
import type { User } from '@/actions/users';

export function useUserDialogs() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Single user dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Bulk action dialogs
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkActivateDialogOpen, setBulkActivateDialogOpen] = useState(false);
  const [bulkDeactivateDialogOpen, setBulkDeactivateDialogOpen] = useState(false);
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>('user');

  // Dialog openers
  const openAddDialog = useCallback(() => setAddDialogOpen(true), []);

  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const openRoleDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  }, []);

  const openResetPasswordDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }, []);

  const openStatusDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setStatusDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const openBulkRoleDialog = useCallback((role: string) => {
    setBulkRole(role);
    setBulkRoleDialogOpen(true);
  }, []);

  const openBulkActivateDialog = useCallback(() => setBulkActivateDialogOpen(true), []);
  const openBulkDeactivateDialog = useCallback(() => setBulkDeactivateDialogOpen(true), []);
  const openBulkDeleteDialog = useCallback(() => setBulkDeleteDialogOpen(true), []);

  return {
    selectedUser,
    bulkRole,

    // Single user dialog states
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

    // Bulk dialog states
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkActivateDialogOpen,
    setBulkActivateDialogOpen,
    bulkDeactivateDialogOpen,
    setBulkDeactivateDialogOpen,
    bulkRoleDialogOpen,
    setBulkRoleDialogOpen,

    // Dialog openers
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
  };
}
