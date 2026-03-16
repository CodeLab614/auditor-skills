'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, Users, UserCog } from 'lucide-react';
import type { User } from './users-content';

type Role = 'admin' | 'moderator' | 'user';

const roleConfig: Record<
  Role,
  { icon: React.ElementType; label: string; description: string; color: string }
> = {
  admin: {
    icon: Shield,
    label: 'Admin',
    description: 'Full access to all features and settings',
    color: 'text-purple-400',
  },
  moderator: {
    icon: UserCog,
    label: 'Moderator',
    description: 'Can manage users and content',
    color: 'text-blue-400',
  },
  user: {
    icon: Users,
    label: 'User',
    description: 'Standard access to the platform',
    color: 'text-muted-foreground',
  },
};

interface ChangeRoleDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (user: User, newRole: Role) => Promise<void> | void;
}

export function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
}: ChangeRoleDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role>('user');

  React.useEffect(() => {
    if (user) {
      setSelectedRole(user.role as Role);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await onSubmit?.(user, selectedRole);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleConfig = roleConfig[selectedRole];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-card border-border'>
        <DialogHeader>
          <DialogTitle className='font-medium'>Change User Role</DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            Update the role for {user?.name}. This will change their permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='role' className='text-sm font-normal'>
              Select Role
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as Role)}
            >
              <SelectTrigger className='bg-background border-border'>
                <SelectValue placeholder='Select a role' />
              </SelectTrigger>
              <SelectContent className='bg-card border-border'>
                {Object.entries(roleConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-2'>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className='rounded-md border border-border bg-background/50 p-4'>
            <div className='flex items-center gap-3'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center bg-muted ${currentRoleConfig.color}`}
              >
                <CurrentIcon className='h-5 w-5' />
              </div>
              <div>
                <p className='text-sm font-medium'>{currentRoleConfig.label}</p>
                <p className='text-xs text-muted-foreground'>
                  {currentRoleConfig.description}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className='pt-4 flex flex-row gap-3 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className='flex-1 sm:flex-none sm:w-28'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isLoading || selectedRole === user?.role}
              className='flex-1 sm:flex-none sm:w-28'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
