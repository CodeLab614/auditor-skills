---
title: Handle not found case explicitly
impact: HIGH
tags: fetch, single, notfound
---

## Single Item Fetch - Handle Not Found

When fetching a single item, always handle the "not found" case explicitly.

**Incorrect:**

```typescript
export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return { success: true, data: user };
    // data could be null! Component needs to handle this
  } catch (error) {
    // ...
  }
}
```

**Correct:**

```typescript
export async function getUserById(id: string): Promise<
  { success: true; data: User } | { success: false; error: string }
> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to get user:", error);
    return { success: false, error: "Failed to get user" };
  }
}
```

**Why it matters:**
- Explicit not found handling provides clear error messages
- TypeScript knows data is never null when success is true
- Component doesn't need null checks after success check
- User gets meaningful feedback instead of blank page
