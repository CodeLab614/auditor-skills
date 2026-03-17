---
title: Every async function must have try-catch
impact: CRITICAL
tags: error, try-catch, handling
---

## Try-Catch Required

Every async function in a server action MUST have try-catch error handling.

**Incorrect:**

```typescript
"use server";

export async function getUsers() {
  const users = await prisma.user.findMany();
  return { success: true, data: users };
}
// If prisma throws, the error propagates unhandled!
```

**Correct:**

```typescript
"use server";

export async function getUsers(): Promise<
  { success: true; data: User[] } | { success: false; error: string }
> {
  try {
    const users = await prisma.user.findMany();
    return { success: true, data: users };
  } catch (error) {
    console.error("Failed to get users:", error);
    return { success: false, error: "Failed to get users" };
  }
}
```

**Why it matters:**
- Unhandled errors crash the server action
- Proper error handling provides user-friendly messages
- Allows graceful degradation in the UI
- Errors are logged for debugging
