'use client';

import * as React from 'react';
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react';
import { deleteOwnAccountAction } from '@/actions/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountDeletionDialog({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const canSubmit = confirmation === 'DELETE' && (!hasPassword || password.length > 0);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPassword('');
      setConfirmation('');
      setError('');
    }
  };

  const handleDelete = () => {
    setError('');
    startTransition(async () => {
      const result = await deleteOwnAccountAction({
        password: hasPassword ? password : undefined,
        confirmation,
      });
      if (result.response === 'error') setError(result.message);
    });
  };

  return (
    <>
      <Card className="gap-4 border-destructive/40 bg-destructive/[0.035] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-destructive/10 p-2 text-destructive">
              <Trash2 className="size-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h3 className="font-medium text-destructive">Delete account</h3>
              <p className="max-w-xl text-sm text-muted-foreground">
                Permanently remove your profile and account data. This action cannot be undone.
              </p>
            </div>
          </div>
          <Button variant="destructive" className="w-full shrink-0 sm:w-auto" onClick={() => handleOpenChange(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="text-lg">Delete your account?</DialogTitle>
            <DialogDescription>
              Your profile, avatar, sessions, connected accounts, two-factor authentication, and activity history will be permanently deleted. You will receive an email notice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="rounded-md border border-destructive/25 bg-destructive/[0.04] px-3 py-2.5 text-sm text-foreground">
              This action is irreversible. You will be signed out immediately.
            </p>
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-account-password">Password</Label>
                <Input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={error ? 'delete-account-error' : undefined}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirmation">Type DELETE to confirm</Label>
              <Input
                id="delete-account-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            {error && <Alert id="delete-account-error" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!canSubmit || isPending}
              onClick={handleDelete}
              className="gap-2"
            >
              {isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Deleting account…' : 'Delete account permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
