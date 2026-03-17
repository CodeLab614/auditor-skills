---
title: Never use action attribute on forms
impact: CRITICAL
tags: form, onSubmit, action, react-hook-form
---

## Never Use `action` on Forms

Forms must NEVER use the `action` attribute. Always use React Hook Form with `onSubmit`.

**Incorrect (NEVER do this):**

```typescript
"use client";

import { useActionState } from "react";
import { submitForm } from "@/actions/form";

export function MyForm() {
  // ❌ WRONG: Using useActionState
  const [state, formAction, isPending] = useActionState(submitForm, {});

  return (
    // ❌ WRONG: Using action attribute
    <form action={formAction}>
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Also Incorrect:**

```typescript
// ❌ WRONG: Server action accepting FormData
async function submitForm(formData: FormData) {
  const email = formData.get("email");
}
```

**Correct (ALWAYS use this pattern):**

```typescript
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { submitFormAction } from "@/actions/form";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export function MyForm() {
  // ✅ CORRECT: Use useTransition for pending state
  const [isPending, startTransition] = useTransition();

  // ✅ CORRECT: Use React Hook Form with zodResolver
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  // ✅ CORRECT: onSubmit handler with startTransition
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await submitFormAction(values);

      if (result.response === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  };

  return (
    <Form {...form}>
      {/* ✅ CORRECT: Use form.handleSubmit(onSubmit) */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="email" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
```

**Server Action (correct pattern):**

```typescript
'use server';

import * as z from 'zod';

const formSchema = z.object({
  email: z.string().email(),
});

// ✅ CORRECT: Accept typed data, return standard response
export const submitFormAction = async (
  values: z.infer<typeof formSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: null;
}> => {
  try {
    const { success, data } = formSchema.safeParse(values);

    if (!success) {
      return { response: 'error', message: 'Invalid fields', data: null };
    }

    // Do something with data.email
    return { response: 'success', message: 'Form submitted', data: null };
  } catch (error) {
    console.error('Submit form error:', error);
    return { response: 'error', message: 'Submission failed', data: null };
  }
};
```

**Why it matters:**
- React Hook Form provides client-side validation BEFORE server call
- `onSubmit` gives you full control over form submission
- `useTransition` handles pending state cleanly (NOT useActionState)
- Server actions receive typed data (NOT FormData)
- Standard response format works with toast notifications
- Better UX with immediate validation feedback
