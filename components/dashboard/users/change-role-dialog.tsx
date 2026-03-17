'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, Users, UserCog } from 'lucide-react';
import { changeRoleAction } from '@/actions/users';
import { changeRoleSchema, type ChangeRoleFormData } from '@/validations/users';
import type { User } from '@/actions/users';

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
  onSuccess?: () => void;
}

export function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: ChangeRoleDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ChangeRoleFormData>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: {
      role: 'user',
    },
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (user && open) {
      form.reset({
        role: user.role as Role,
      });
    }
  }, [user, open, form]);

  const onSubmit = (values: ChangeRoleFormData) => {
    if (!user) return;

    startTransition(async () => {
      const result = await changeRoleAction(user.id, values);

      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    });
  };

   
  const selectedRole = form.watch('role') as Role;
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-4'>
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-normal'>
                    Select Role
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='bg-background border-border'>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                    </FormControl>
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
                </FormItem>
              )}
            />

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
                disabled={isPending}
                className='flex-1 sm:flex-none sm:w-28'
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isPending || selectedRole === user?.role}
                className='flex-1 sm:flex-none sm:w-28'
              >
                {isPending ? (
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
