/**
 * Auth Form with Server Actions Pattern
 *
 * This is the REQUIRED pattern for all forms in this project.
 *
 * Key Rules:
 * 1. NEVER use form action attribute - use onSubmit with handleSubmit
 * 2. ALWAYS use React Hook Form with zodResolver
 * 3. ALWAYS use useTransition for async server action calls
 * 4. Server actions accept typed data (NOT FormData)
 * 5. Server actions return: { response: 'success' | 'error', message: string, data: T | null }
 *
 * Dependencies:
 * - react-hook-form
 * - @hookform/resolvers/zod
 * - zod
 * - shadcn/ui form components
 */

'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// ============================================
// 1. VALIDATION SCHEMA (in validations/auth.ts)
// ============================================

/**
 * Define schema with Zod
 * - Include all validation rules
 * - Use descriptive error messages
 * - Export type for server action
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// 2. SERVER ACTION (in actions/auth/sign-in.ts)
// ============================================

/**
 * Server Action Pattern
 * - Accept z.infer<typeof schema> as parameter
 * - Return { response: 'success' | 'error', message: string, data: T | null }
 * - Use safeParse for server-side validation
 */

type SignInData = {
  twoFactorRequired?: boolean;
};

export const signInAction = async (
  values: z.infer<typeof loginSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: SignInData | null;
}> => {
  'use server';

  try {
    const { success, data } = loginSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    const { email, password } = data;

    // Call your auth API here
    // const result = await auth.api.signIn({ ... });

    return {
      response: 'success',
      message: 'Login successful',
      data: null,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};

// ============================================
// 3. CLIENT FORM COMPONENT
// ============================================

/**
 * Form Component Pattern
 * - "use client" directive
 * - useTransition for pending state
 * - useForm with zodResolver
 * - handleSubmit wrapper
 * - Toast notifications
 * - Router navigation
 */
export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize form with zodResolver
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Submit handler with useTransition
  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    startTransition(async () => {
      const result = await signInAction(values);

      if (result.response === 'error') {
        toast.error(result.message);
        return;
      }

      if (result.data?.twoFactorRequired) {
        router.push('/auth/two-factor');
        return;
      }

      toast.success(result.message);
      router.push('/dashboard');
    });
  };

  return (
    <Form {...form}>
      {/* CRITICAL: Use onSubmit, NEVER action attribute */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}

// ============================================
// WRONG PATTERNS - NEVER DO THIS
// ============================================

/**
 * ❌ WRONG: Using action attribute
 *
 * <form action={signIn}>
 *   <input name="email" />
 *   <button type="submit">Sign in</button>
 * </form>
 */

/**
 * ❌ WRONG: Server action accepting FormData
 *
 * async function signIn(formData: FormData) {
 *   const email = formData.get("email");
 *   // ...
 * }
 */

/**
 * ❌ WRONG: Using useActionState
 *
 * const [state, formAction] = useActionState(signIn, initialState);
 * <form action={formAction}>
 */

/**
 * ❌ WRONG: Old response format { success: boolean, error?: string }
 *
 * return { success: false, error: "Something went wrong" };
 */

/**
 * ❌ WRONG: No validation
 *
 * function BadForm() {
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     const email = e.target.email.value; // No validation!
 *     await signIn({ email });
 *   };
 * }
 */

// ============================================
// CORRECT PATTERN CHECKLIST
// ============================================

/**
 * ✅ Form Component:
 * 1. "use client" directive
 * 2. useTransition for pending state
 * 3. useForm with zodResolver(schema)
 * 4. defaultValues for all fields
 * 5. form.handleSubmit(onSubmit) on form element
 * 6. FormField with control={form.control}
 * 7. Disable inputs when isPending
 * 8. Show loading state in button
 *
 * ✅ Server Action:
 * 1. "use server" directive (or separate file)
 * 2. Accept typed data: z.infer<typeof schema>
 * 3. Validate with schema.safeParse(data)
 * 4. Return: { response: 'success' | 'error', message: string, data: T | null }
 * 5. Handle errors with try/catch
 *
 * ✅ Response Handling:
 * 1. Check result.response === 'error'
 * 2. Show toast.error(result.message) on error
 * 3. Show toast.success(result.message) on success
 * 4. Access data via result.data
 *
 * ✅ Schema (validations/*.ts):
 * 1. Define with z.object({...})
 * 2. Use z.infer<typeof schema> for type inference
 * 3. Include descriptive error messages
 * 4. Share between client and server
 */
