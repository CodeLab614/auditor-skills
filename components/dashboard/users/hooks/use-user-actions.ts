import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  deleteUser,
  bulkChangeRole,
  bulkDeleteUsers,
  bulkToggleStatus,
  toggleUserStatus,
  type User,
} from '@/actions/users';

interface UseUserActionsProps {
  selectedUser: User | null;
  selectedIds: string[];
  bulkRole: string;
  onClearSelection: () => void;
  onCloseBulkActivateDialog: () => void;
  onCloseBulkDeactivateDialog: () => void;
  onCloseBulkRoleDialog: () => void;
  onCloseBulkDeleteDialog: () => void;
}

export function useUserActions({
  selectedUser,
  selectedIds,
  bulkRole,
  onClearSelection,
  onCloseBulkActivateDialog,
  onCloseBulkDeactivateDialog,
  onCloseBulkRoleDialog,
  onCloseBulkDeleteDialog,
}: UseUserActionsProps) {
  const router = useRouter();

  // Single user actions
  const handleToggleStatus = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const activate = selectedUser.status !== 'active';
      const result = await toggleUserStatus(selectedUser.id, activate);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change user status');
    }
  }, [selectedUser, router]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const result = await deleteUser(selectedUser.id);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  }, [selectedUser, router]);

  // Bulk actions
  const handleBulkActivate = useCallback(async () => {
    try {
      const result = await bulkToggleStatus(selectedIds, true);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to bulk activate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate users');
    }
    onClearSelection();
    onCloseBulkActivateDialog();
  }, [selectedIds, router, onClearSelection, onCloseBulkActivateDialog]);

  const handleBulkDeactivate = useCallback(async () => {
    try {
      const result = await bulkToggleStatus(selectedIds, false);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to bulk deactivate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate users');
    }
    onClearSelection();
    onCloseBulkDeactivateDialog();
  }, [selectedIds, router, onClearSelection, onCloseBulkDeactivateDialog]);

  const handleBulkChangeRole = useCallback(async () => {
    try {
      const result = await bulkChangeRole(selectedIds, bulkRole);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to bulk change roles:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update roles');
    }
    onClearSelection();
    onCloseBulkRoleDialog();
  }, [selectedIds, bulkRole, router, onClearSelection, onCloseBulkRoleDialog]);

  const handleBulkDelete = useCallback(async () => {
    try {
      const result = await bulkDeleteUsers(selectedIds);
      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete users');
    }
    onClearSelection();
    onCloseBulkDeleteDialog();
  }, [selectedIds, router, onClearSelection, onCloseBulkDeleteDialog]);

  return {
    handleToggleStatus,
    handleDeleteUser,
    handleBulkActivate,
    handleBulkDeactivate,
    handleBulkChangeRole,
    handleBulkDelete,
  };
}
