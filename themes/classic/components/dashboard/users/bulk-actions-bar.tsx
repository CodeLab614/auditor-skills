'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  X,
  ChevronDown,
  Shield,
  Ban,
  UserCheck,
  Trash2,
} from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkChangeRole: (role: string) => void;
  onBulkDelete: () => void;
  isAdmin: boolean;
}

export function BulkActionsBar({
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
