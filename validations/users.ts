import { z } from 'zod';

export const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'moderator', 'user']),
  sendInvite: z.boolean(),
});

export const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

export const changeRoleSchema = z.object({
  role: z.enum(['admin', 'moderator', 'user']),
});

export const resetPasswordSchema = z.object({
  method: z.enum(['email', 'manual']),
});

export type AddUserFormData = z.infer<typeof addUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
export type ChangeRoleFormData = z.infer<typeof changeRoleSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
