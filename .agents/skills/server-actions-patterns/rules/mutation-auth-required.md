---
title: Always verify session before mutations
impact: MEDIUM
tags: mutation, auth, session
---

## Session Verification for Mutations

Always verify the user session before performing any mutation (create, update, delete).

**Incorrect:**

```typescript
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    return { success: true };
    // Anyone can delete any user!
  } catch (error) {
    // ...
  }
}
```

**Correct:**

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function deleteUser(id: string): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Optional: Check if user has permission
    if (session.user.role !== "admin") {
      return { success: false, error: "Forbidden" };
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
- Prevents unauthorized modifications
- Enables role-based access control
- Audit trail knows who performed the action
- Security requirement for all mutations
