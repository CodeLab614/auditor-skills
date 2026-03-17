---
name: server-actions-patterns
description: "Next.js Server Actions patterns for this project. Use when creating server actions, data fetching functions, or mutations. Covers try-catch patterns, return types, folder structure, and integration with pages/components."
license: MIT
metadata:
  author: project
  version: "2.0.0"
---

# Server Actions Patterns

Comprehensive patterns and rules for implementing Server Actions in this Next.js project. Contains rules for structure, error handling, return types, and integration patterns.

## CRITICAL: Standard Response Format

**ALL server actions MUST use this response format:**

```typescript
type ActionResponse<T> = {
  response: 'success' | 'error';
  message: string;
  data: T | null;
};
```

### Example:

```typescript
'use server';

import * as z from 'zod';
import { someSchema } from '@/validations/some';

export const someAction = async (
  values: z.infer<typeof someSchema>
): Promise<{
  response: 'success' | 'error';
  message: string;
  data: SomeData | null;
}> => {
  try {
    const { success, data } = someSchema.safeParse(values);

    if (!success) {
      return {
        response: 'error',
        message: 'Invalid fields',
        data: null,
      };
    }

    // ... do something with data

    return {
      response: 'success',
      message: 'Operation completed successfully',
      data: result,
    };
  } catch (error) {
    console.error('Action error:', error);
    return {
      response: 'error',
      message: 'An unexpected error occurred',
      data: null,
    };
  }
};
```

## When to Apply

Reference these guidelines when:
- Creating new server actions for data fetching
- Implementing mutations (create, update, delete)
- Setting up form submissions with React Hook Form
- Integrating actions with pages and components
- Reviewing code for action-related issues

## Rule Categories

| Category | Impact | Prefix |
|----------|--------|--------|
| Structure & Location | CRITICAL | `structure-` |
| Error Handling | CRITICAL | `error-` |
| Forms | CRITICAL | `form-` |
| Return Types | HIGH | `return-` |
| Data Fetching | HIGH | `fetch-` |
| Mutations | MEDIUM | `mutation-` |
| Integration | MEDIUM | `integration-` |

## Quick Reference

### Structure Rules (CRITICAL)

- `structure-location` - All actions in `actions/` folder, never in `lib/actions/`
- `structure-use-server` - Always start files with `"use server"` directive
- `structure-export-types` - Export types from action files for component use
- **Action Naming**: Always suffix with `Action` (e.g., `signInAction`, `updateProfileAction`)

### Error Handling Rules (CRITICAL)

- `error-try-catch` - Every async function must have try-catch
- `error-console-log` - Always console.error before returning error
- `error-no-throw` - Never throw errors, return error object instead

### Return Type Rules (HIGH)

- `return-discriminated-union` - Use `{ response: 'success' | 'error', message: string, data: T | null }`
- `return-type-annotation` - Always annotate return type with Promise
- `return-serialize-dates` - Convert Date objects to ISO strings

### Data Fetching Rules (HIGH)

- `fetch-single-item` - Handle not found case explicitly
- `fetch-list-transform` - Transform data in the action, not in component
- `fetch-auth-check` - Check authentication for protected data

### Mutation Rules (MEDIUM)

- `mutation-auth-required` - Always verify session before mutations
- `mutation-log-activity` - Log user activities after successful mutations
- `mutation-return-id` - Return created/updated item ID on success

### Form Rules (CRITICAL)

- `form-never-action` - **NEVER** use `action` attribute on forms, always use `onSubmit`
- `form-use-transition` - Use `useTransition` for pending state, **NEVER** `useActionState`
- `form-typed-params` - Accept `z.infer<typeof schema>` as parameter, **NEVER** `FormData`
- `form-api-error` - Handle APIError from better-auth specifically

### Integration Rules (MEDIUM)

- `integration-page-call` - Call actions in page.tsx, pass data to components
- `integration-error-display` - Handle error case in page before rendering
- `integration-router-refresh` - Use router.refresh() after mutations in client

## Templates

See `templates/` folder for copy-paste ready examples:

| Template | Description |
|----------|-------------|
| `basic-action.ts` | Simple action with validation |
| `auth-action.ts` | Authentication action with Better Auth |
| `crud-action.ts` | CRUD operations pattern |
| `data-fetch-action.ts` | Data fetching with Prisma |

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/structure-location.md
rules/error-try-catch.md
rules/return-discriminated-union.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example
- Correct code example
- Additional context

## File Structure Reference

```
actions/
├── activity.ts          # Activity logs queries
├── activity-log.ts      # Activity logging utilities
├── auth/
│   ├── sign-in.ts       # signInAction, resendVerificationEmailAction
│   ├── sign-up.ts       # signUpAction
│   ├── password.ts      # forgotPasswordAction, resetPasswordAction, changePasswordAction
│   ├── profile.ts       # updateProfileAction
│   ├── sign-out.ts      # signOut
│   └── two-factor.ts    # verifyTotpAction, enable2FAAction, etc.
├── dashboard.ts         # Dashboard metrics
├── profile.ts           # Profile data
├── sessions.ts          # Session management
└── users.ts             # User management
```

## WRONG Patterns (NEVER use these)

```typescript
// ❌ WRONG: Using FormData
async function signIn(formData: FormData) {
  const email = formData.get("email");
}

// ❌ WRONG: Old response format
return { success: false, error: "Something went wrong" };

// ❌ WRONG: Using useActionState
const [state, formAction] = useActionState(signIn, initialState);

// ❌ WRONG: Form action attribute
<form action={signIn}>

// ❌ WRONG: Missing "Action" suffix
export async function signIn(values) { }
```

## CORRECT Patterns (Always use these)

```typescript
// ✅ CORRECT: Typed parameters
export const signInAction = async (
  values: z.infer<typeof loginSchema>
): Promise<ActionResponse<SignInData>> => { }

// ✅ CORRECT: New response format
return {
  response: 'error',
  message: 'Invalid credentials',
  data: null,
};

// ✅ CORRECT: useTransition in client
const [isPending, startTransition] = useTransition();

// ✅ CORRECT: onSubmit handler
<form onSubmit={form.handleSubmit(onSubmit)}>

// ✅ CORRECT: "Action" suffix
export const signInAction = async (values) => { }
```
