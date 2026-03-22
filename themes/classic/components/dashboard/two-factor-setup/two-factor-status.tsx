'use client';

import * as React from 'react';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Enable2FADialog } from './enable-2fa-dialog';
import { Disable2FADialog } from './disable-2fa-dialog';

interface TwoFactorStatusProps {
  enabled: boolean;
  onStatusChange?: (enabled: boolean) => void;
}

export function TwoFactorStatus({
  enabled,
  onStatusChange,
}: TwoFactorStatusProps) {
  const [isEnableOpen, setIsEnableOpen] = React.useState(false);
  const [isDisableOpen, setIsDisableOpen] = React.useState(false);

  const handleEnableSuccess = () => {
    onStatusChange?.(true);
  };

  const handleDisableSuccess = () => {
    onStatusChange?.(false);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">Two-Factor Authentication</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? 'Your account is protected with 2FA.'
              : 'Add an extra layer of security to your account.'}
          </p>
        </div>
        {enabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDisableOpen(true)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <ShieldOff className="h-4 w-4" />
            Disable
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEnableOpen(true)}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Enable
          </Button>
        )}
      </div>

      <Enable2FADialog
        open={isEnableOpen}
        onOpenChange={setIsEnableOpen}
        onSuccess={handleEnableSuccess}
      />

      <Disable2FADialog
        open={isDisableOpen}
        onOpenChange={setIsDisableOpen}
        onSuccess={handleDisableSuccess}
      />
    </>
  );
}
