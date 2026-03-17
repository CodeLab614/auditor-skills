---
title: Never throw errors, return error object
impact: CRITICAL
tags: error, throw, return
---

## No Throwing Errors

Never throw errors from server actions. Always return an error object.

**Incorrect:**

```typescript
"use server";

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new Error("User not found"); // ❌ Don't throw!
  }

  await prisma.user.delete({ where: { id } });
}
```

**Correct:**

```typescript
"use server";

export async function deleteUser(id: string): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return { success: false, error: "User not found" }; // ✅ Return error
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
```

**Why it matters:**
- Thrown errors require try-catch in every caller
- Return objects allow simple conditional handling
- Consistent API across all actions
- TypeScript can infer success/error states
