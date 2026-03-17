/**
 * Basic Server Action Template
 *
 * This is the REQUIRED pattern for all server actions in this project.
 *
 * Key Rules:
 * 1. Always use 'use server' directive at top of file
 * 2. Always suffix action names with "Action" (e.g., createItemAction)
 * 3. Accept typed parameters (z.infer<typeof schema>), NEVER FormData
 * 4. Return: { response: 'success' | 'error', message: string, data: T | null }
 * 5. Always validate with Zod safeParse on server
 * 6. Always wrap in try-catch
 * 7. Always console.error before returning error
 */

'use server';

import * as z from 'zod';

// ============================================
// 1. DEFINE YOUR SCHEMA (in validations/*.ts)
// ============================================

/**
 * Define validation schema with Zod
 * - Include all validation rules
 * - Use descriptive error messages
 * - Export for client-side validation too
 */
const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
});

// ============================================
// 2. DEFINE RESPONSE DATA TYPE
// ============================================

/**
 * Define the data type returned on success
 * - Make it specific to what the action returns
 * - Use null for actions that don't return data
 */
type ItemData = {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // Always serialize dates as ISO strings
};

// ============================================
// 3. IMPLEMENT THE ACTION
// ============================================

/**
 * Server Action Template
 *
 * @param values - Typed input matching schema
 * @returns ActionResponse with success/error + message + data
 */
export const createItemAction = async (
  values: z.infer<typeof itemSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: ItemData | null;
}> => {
  try {
    // Step 1: Validate input with Zod
    const { success, data, error } = itemSchema.safeParse(values);

    if (!success) {
      // Return first validation error
      const firstError = error.errors[0]?.message ?? 'Invalid fields';
      return {
        response: 'error',
        message: firstError,
        data: null,
      };
    }

    // Step 2: Destructure validated data
    const { name, description } = data;

    // Step 3: Perform your operation (e.g., database insert)
    // const item = await prisma.item.create({
    //   data: { name, description },
    // });

    // Step 4: Mock response (replace with actual data)
    const item = {
      id: 'generated-id',
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    // Step 5: Return success with data
    return {
      response: 'success',
      message: 'Item created successfully',
      data: item,
    };
  } catch (error) {
    // ALWAYS log the error before returning
    console.error('Create item error:', error);

    // Return user-friendly error message
    return {
      response: 'error',
      message: 'Failed to create item. Please try again.',
      data: null,
    };
  }
};

// ============================================
// USAGE IN CLIENT COMPONENT
// ============================================

/**
 * Example usage with React Hook Form + useTransition:
 *
 * ```tsx
 * 'use client';
 *
 * import { useTransition } from 'react';
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import { toast } from 'sonner';
 * import { createItemAction } from '@/actions/items';
 * import { itemSchema } from '@/validations/items';
 *
 * export function CreateItemForm() {
 *   const [isPending, startTransition] = useTransition();
 *
 *   const form = useForm({
 *     resolver: zodResolver(itemSchema),
 *     defaultValues: { name: '', description: '' },
 *   });
 *
 *   const onSubmit = (values) => {
 *     startTransition(async () => {
 *       const result = await createItemAction(values);
 *
 *       if (result.response === 'error') {
 *         toast.error(result.message);
 *         return;
 *       }
 *
 *       toast.success(result.message);
 *       // Access created item via result.data
 *       console.log('Created:', result.data);
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(onSubmit)}>
 *       // ... form fields
 *     </form>
 *   );
 * }
 * ```
 */

// ============================================
// WRONG PATTERNS - NEVER DO THIS
// ============================================

/**
 * ❌ WRONG: Accepting FormData
 *
 * async function createItem(formData: FormData) {
 *   const name = formData.get("name");
 * }
 */

/**
 * ❌ WRONG: Old response format
 *
 * return { success: false, error: "Something went wrong" };
 */

/**
 * ❌ WRONG: Missing Action suffix
 *
 * export async function createItem(values) { }
 */

/**
 * ❌ WRONG: Throwing errors
 *
 * throw new Error("Something went wrong");
 */

/**
 * ❌ WRONG: Missing try-catch
 *
 * export async function createItemAction(values) {
 *   const item = await prisma.item.create({ data: values });
 *   return { response: 'success', message: 'Created', data: item };
 * }
 */
