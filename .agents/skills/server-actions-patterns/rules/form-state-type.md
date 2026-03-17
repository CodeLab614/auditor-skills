---
title: Define FormState type for form actions
impact: MEDIUM
tags: form, types, useActionState
---

## Form State Type

Define a FormState type with optional `error` and `success` fields for form actions.

**Incorrect:**

```typescript
// No type definition - hard to use with useActionState
export async function submitForm(prevState: any, formData: FormData) {
  // ...
}
```

**Correct:**

```typescript
export type FormState = {
  error?: string;
  success?: boolean;
};

export async function submitForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;

  try {
    // Perform action...
    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message ?? "Operation failed" };
    }
    return { error: "An unexpected error occurred" };
  }
}
```

**Usage with useActionState:**

```typescript
"use client";

import { useActionState } from "react";
import { submitForm, type FormState } from "@/actions/form";

const initialState: FormState = {};

export function MyForm() {
  const [state, formAction, isPending] = useActionState(
    submitForm,
    initialState
  );

  return (
    <form action={formAction}>
      {state.error && <p className="text-destructive">{state.error}</p>}
      {state.success && <p className="text-green-500">Success!</p>}
      <Button disabled={isPending}>Submit</Button>
    </form>
  );
}
```

**Why it matters:**
- TypeScript knows what fields to expect
- useActionState requires consistent state shape
- Components can reliably check error/success
- Enables proper form feedback UI
