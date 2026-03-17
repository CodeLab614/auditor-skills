---
title: Use discriminated union return type
impact: HIGH
tags: return, types, typescript
---

## Discriminated Union Return Type

All server actions MUST return a discriminated union with `response` as the discriminator.

### Standard Response Format

```typescript
type ActionResponse<T> = {
  response: 'success' | 'error';
  message: string;
  data: T | null;
};
```

**Incorrect (OLD pattern - NEVER use):**

```typescript
// ❌ Returns data or undefined - unclear what happened
export async function getUsers() {
  try {
    return await prisma.user.findMany();
  } catch {
    return undefined;
  }
}

// ❌ Old success/error format
export async function signIn(values) {
  return { success: false, error: "Invalid credentials" };
}

// ❌ Missing message field
export async function signIn(values) {
  return { response: 'error', data: null };
}
```

**Correct (NEW pattern - ALWAYS use):**

```typescript
export const getUsersAction = async (): Promise<{
  response: 'success' | 'error';
  message: string;
  data: User[] | null;
}> => {
  try {
    const users = await prisma.user.findMany();
    return {
      response: 'success',
      message: 'Users fetched successfully',
      data: users,
    };
  } catch (error) {
    console.error("Failed to get users:", error);
    return {
      response: 'error',
      message: 'Failed to get users',
      data: null,
    };
  }
};
```

**Usage in Client Components:**

```typescript
const onSubmit = (values: FormData) => {
  startTransition(async () => {
    const result = await someAction(values);

    if (result.response === 'error') {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    // Access data via result.data
  });
};
```

**Usage in Server Components:**

```typescript
export default async function Page() {
  const result = await getUsersAction();

  if (result.response === 'error') {
    return <div>Error: {result.message}</div>;
  }

  return <UsersContent users={result.data} />;
}
```

**Why it matters:**
- TypeScript narrows types based on `response` check
- `message` field provides user-friendly feedback for both success and error
- `data` is typed and nullable - clear contract
- Consistent pattern across ALL actions
- No null/undefined ambiguity
- Works seamlessly with toast notifications
