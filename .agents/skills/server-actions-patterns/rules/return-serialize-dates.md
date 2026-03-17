---
title: Convert Date objects to ISO strings
impact: HIGH
tags: return, dates, serialization
---

## Serialize Dates

Always convert Prisma Date objects to ISO strings before returning.

**Incorrect:**

```typescript
export async function getUsers() {
  try {
    const users = await prisma.user.findMany();
    return { success: true, data: users };
    // Error: Date objects can't be serialized for client!
  } catch (error) {
    // ...
  }
}
```

**Correct:**

```typescript
export type User = {
  id: string;
  name: string;
  createdAt: string; // String, not Date
  updatedAt: string;
};

export async function getUsers(): Promise<
  { success: true; data: User[] } | { success: false; error: string }
> {
  try {
    const users = await prisma.user.findMany();

    return {
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to get users:", error);
    return { success: false, error: "Failed to get users" };
  }
}
```

**Why it matters:**
- Server Components can only pass serializable data to Client Components
- Date objects are not serializable across the network boundary
- ISO strings can be parsed back to Date in the client if needed
- Prevents "cannot serialize" runtime errors
