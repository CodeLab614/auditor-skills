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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface NewUserData {
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  sendInvite: boolean;
}

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: NewUserData) => Promise<void> | void;
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddUserDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<NewUserData>({
    name: '',
    email: '',
    role: 'user',
    sendInvite: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit?.(formData);
      setFormData({ name: '', email: '', role: 'user', sendInvite: true });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof NewUserData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-card border-border'>
        <DialogHeader>
          <DialogTitle className='font-medium'>Add New User</DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            Create a new user account. An invitation email will be sent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='name' className='text-sm font-normal'>
              Full Name
            </Label>
            <Input
              id='name'
              placeholder='John Doe'
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              className='bg-background border-border'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email' className='text-sm font-normal'>
              Email Address
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='john@example.com'
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              className='bg-background border-border'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='role' className='text-sm font-normal'>
              Role
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange('role', value)}
            >
              <SelectTrigger className='bg-background border-border'>
                <SelectValue placeholder='Select a role' />
              </SelectTrigger>
              <SelectContent className='bg-card border-border'>
                <SelectItem value='user'>User</SelectItem>
                <SelectItem value='moderator'>Moderator</SelectItem>
                <SelectItem value='admin'>Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              {formData.role === 'admin' && 'Full access to all features and settings.'}
              {formData.role === 'moderator' && 'Can manage users and content.'}
              {formData.role === 'user' && 'Standard access to the platform.'}
            </p>
          </div>

          <div className='flex items-center gap-2 pt-2'>
            <input
              type='checkbox'
              id='sendInvite'
              checked={formData.sendInvite}
              onChange={(e) => handleChange('sendInvite', e.target.checked)}
              className='h-4 w-4 rounded border-border bg-background accent-primary'
            />
            <Label
              htmlFor='sendInvite'
              className='text-sm font-normal text-muted-foreground cursor-pointer'
            >
              Send invitation email
            </Label>
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
              disabled={isLoading}
              className='flex-1 sm:flex-none sm:w-28'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
