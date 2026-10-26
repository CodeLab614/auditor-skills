import { useState, useCallback } from 'react';
import type { User } from '@/actions/users';

export function useUserDialogs() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Single user dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Bulk action dialogs
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkActivateDialogOpen, setBulkActivateDialogOpen] = useState(false);
  const [bulkDeactivateDialogOpen, setBulkDeactivateDialogOpen] = useState(false);
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>('user');

  // Dialog openers
  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const openRoleDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
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
    editDialogOpen,
    setEditDialogOpen,
    roleDialogOpen,
    setRoleDialogOpen,
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
    openEditDialog,
    openRoleDialog,
    openStatusDialog,
    openDeleteDialog,
    openBulkRoleDialog,
    openBulkActivateDialog,
    openBulkDeactivateDialog,
    openBulkDeleteDialog,
  };
}
