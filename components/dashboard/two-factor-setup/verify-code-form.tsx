'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  verifyTotpSetupSchema,
  type VerifyTotpSetupFormData,
} from '@/validations/auth';
import { verify2FASetupAction } from '@/actions/auth';

import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface VerifyCodeFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function VerifyCodeForm({ onSuccess, onBack }: VerifyCodeFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<VerifyTotpSetupFormData>({
    resolver: zodResolver(verifyTotpSetupSchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = (values: VerifyTotpSetupFormData) => {
    startTransition(async () => {
      const result = await verify2FASetupAction(values.code);

      if (result.response === 'error') {
        toast.error(result.message);
        form.reset();
        return;
      }

      toast.success(result.message);
      onSuccess();
    });
  };

  const handleComplete = (value: string) => {
    form.setValue('code', value);
    if (value.length === 6) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                    onComplete={handleComplete}
                    disabled={isPending}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </FormControl>
              <FormMessage className="text-center" />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={isPending}
          >
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
