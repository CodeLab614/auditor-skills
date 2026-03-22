'use client';

import * as React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QRCodeStepProps {
  totpURI: string;
  onContinue: () => void;
}

export function QRCodeStep({ totpURI, onContinue }: QRCodeStepProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    const generateQR = async () => {
      const qrDataUrl = await QRCode.toDataURL(totpURI, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrDataUrl);
    };
    generateQR();
  }, [totpURI]);

  const getSecretFromURI = (uri: string): string => {
    try {
      const url = new URL(uri);
      return url.searchParams.get('secret') || '';
    } catch {
      return '';
    }
  };

  const handleCopySecret = async () => {
    const secret = getSecretFromURI(totpURI);
    await navigator.clipboard.writeText(secret);
    toast.success('Secret copied');
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-lg">
          {qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Can&apos;t scan? Enter this code manually:
        </Label>
        <div className="relative">
          <Input
            readOnly
            value={getSecretFromURI(totpURI)}
            className="font-mono text-xs pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={handleCopySecret}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button onClick={onContinue} className="w-full">
        I&apos;ve scanned the code
      </Button>
    </div>
  );
}
