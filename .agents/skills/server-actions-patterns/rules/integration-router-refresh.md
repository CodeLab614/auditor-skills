---
title: Use router.refresh() after mutations in client
impact: MEDIUM
tags: integration, router, refresh
---

## Router Refresh After Mutations

After mutations in Client Components, use `router.refresh()` to reload server data.

**Incorrect:**

```typescript
"use client";

export function UserActions({ userId }: { userId: string }) {
  const handleDelete = async () => {
    await deleteUser(userId);
    toast.success("User deleted");
    // Page still shows deleted user!
  };

  return <Button onClick={handleDelete}>Delete</Button>;
}
```

**Correct:**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { deleteUser } from "@/actions/users";
import { toast } from "sonner";

export function UserActions({ userId }: { userId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      const result = await deleteUser(userId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("User deleted");
      router.refresh(); // Reload server data
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  return <Button onClick={handleDelete}>Delete</Button>;
}
```

**Why it matters:**
- `router.refresh()` re-runs the page's server component
- Server action is called again, fetching fresh data
- UI updates to reflect the mutation
- No need to manage local state for server data
