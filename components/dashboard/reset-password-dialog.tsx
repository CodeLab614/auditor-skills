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
import { Loader2, Mail, KeyRound } from 'lucide-react';
import type { User } from './users-content';

type ResetMethod = 'email' | 'manual';

interface ResetPasswordDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (user: User, method: ResetMethod) => Promise<void> | void;
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
}: ResetPasswordDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [method, setMethod] = React.useState<ResetMethod>('email');

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await onSubmit?.(user, method);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-card border-border'>
        <DialogHeader>
          <DialogTitle className='font-medium'>Reset Password</DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            Choose how to reset the password for {user?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <Label className='text-sm font-normal'>Reset Method</Label>

          <div className='space-y-3'>
            <button
              type='button'
              onClick={() => setMethod('email')}
              className={`w-full p-4 rounded-md border text-left transition-colors ${
                method === 'email'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/50'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    method === 'email'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Mail className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-medium'>Send Reset Email</p>
                  <p className='text-xs text-muted-foreground'>
                    User will receive a link to reset their password
                  </p>
                </div>
              </div>
            </button>

            <button
              type='button'
              onClick={() => setMethod('manual')}
              className={`w-full p-4 rounded-md border text-left transition-colors ${
                method === 'manual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/50'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    method === 'manual'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <KeyRound className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-sm font-medium'>Generate Temporary Password</p>
                  <p className='text-xs text-muted-foreground'>
                    Create a one-time password that must be changed on login
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter className='flex flex-row gap-3 sm:justify-end'>
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
            onClick={handleSubmit}
            disabled={isLoading}
            className='flex-1 sm:flex-none sm:w-28'
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending...
              </>
            ) : method === 'email' ? (
              'Send Email'
            ) : (
              'Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
