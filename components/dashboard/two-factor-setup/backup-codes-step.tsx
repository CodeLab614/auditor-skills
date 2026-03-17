'use client';

import * as React from 'react';
import { KeyRound, Copy, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BackupCodesStepProps {
  backupCodes: string[];
  onComplete: () => void;
}

export function BackupCodesStep({ backupCodes, onComplete }: BackupCodesStepProps) {
  const [copiedCodes, setCopiedCodes] = React.useState(false);

  const handleCopyBackupCodes = async () => {
    try {
      const codesText = backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
    } catch {
      toast.error('Failed to copy codes');
    }
  };

  const handleDownloadBackupCodes = () => {
    const codesText = `RapidAuth Backup Codes\n${'='.repeat(30)}\n\nKeep these codes in a safe place. Each code can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapidauth-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Backup codes downloaded');
  };

  return (
    <div className="space-y-4 py-4">
      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <div className="flex items-start gap-2">
          <KeyRound className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">Save your backup codes</p>
            <p className="text-muted-foreground mt-1">
              If you lose access to your authenticator app, you can use these
              codes to sign in. Each code can only be used once.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 p-4 bg-secondary rounded-lg font-mono text-sm">
        {backupCodes.map((code, index) => (
          <div key={index} className="px-2 py-1 bg-background rounded">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyBackupCodes}
          className="flex-1 gap-2"
        >
          {copiedCodes ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedCodes ? 'Copied!' : 'Copy'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadBackupCodes}
          className="flex-1 gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <Button onClick={onComplete} className="w-full">
        I&apos;ve saved my backup codes
      </Button>
    </div>
  );
}
