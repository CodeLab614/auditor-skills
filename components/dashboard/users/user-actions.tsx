'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Ban,
  UserCheck,
  KeyRound,
} from 'lucide-react';
import type { User } from '@/actions/users';

interface UserActionsProps {
  user: User;
  isAdmin: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onChangeRole: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

export function UserActions({
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
