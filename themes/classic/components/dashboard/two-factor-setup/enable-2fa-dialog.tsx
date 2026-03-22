'use client';

import * as React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { PasswordStepForm } from './password-step-form';
import { QRCodeStep } from './qr-code-step';
import { VerifyCodeForm } from './verify-code-form';
import { BackupCodesStep } from './backup-codes-step';

type SetupStep = 'password' | 'qrcode' | 'verify' | 'backup' | 'complete';

interface Enable2FADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function Enable2FADialog({
  open,
  onOpenChange,
  onSuccess,
}: Enable2FADialogProps) {
  const [step, setStep] = React.useState<SetupStep>('password');
  const [totpURI, setTotpURI] = React.useState<string>('');
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);

  const resetState = () => {
    setStep('password');
    setTotpURI('');
    setBackupCodes([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handlePasswordSuccess = (data: {
    totpURI: string;
    backupCodes: string[];
  }) => {
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setStep('qrcode');
  };

  const handleComplete = () => {
    setStep('complete');
    onSuccess();
    setTimeout(() => {
      handleOpenChange(false);
    }, 2000);
  };

  const getDescription = () => {
    switch (step) {
      case 'password':
        return 'Enter your password to begin setup.';
      case 'qrcode':
        return 'Scan the QR code with your authenticator app.';
      case 'verify':
        return 'Enter the 6-digit code from your authenticator app.';
      case 'backup':
        return 'Save your backup codes in a secure location.';
      case 'complete':
        return 'Your account is now protected with 2FA.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {step === 'complete'
              ? '2FA Enabled!'
              : 'Set Up Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {step === 'password' && (
          <PasswordStepForm onSuccess={handlePasswordSuccess} />
        )}

        {step === 'qrcode' && (
          <QRCodeStep totpURI={totpURI} onContinue={() => setStep('verify')} />
        )}

        {step === 'verify' && (
          <VerifyCodeForm
            onSuccess={() => setStep('backup')}
            onBack={() => setStep('qrcode')}
          />
        )}

        {step === 'backup' && (
          <BackupCodesStep backupCodes={backupCodes} onComplete={handleComplete} />
        )}

        {step === 'complete' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-center text-muted-foreground">
              Two-factor authentication is now enabled on your account.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
