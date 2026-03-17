---
title: Export types from action files
impact: CRITICAL
tags: structure, types, typescript
---

## Export Types

Always export types from action files for use in components.

**Incorrect:**

```typescript
"use server";

// Type not exported - components can't use it
type User = {
  id: string;
  name: string;
};

export async function getUsers() {
  // ...
}
```

**Correct:**

```typescript
"use server";

// Export the type for component use
export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export async function getUsers(): Promise<
  { success: true; data: User[] } | { success: false; error: string }
> {
  // ...
}
```

**Usage in component:**

```typescript
import { getUsers, type User } from "@/actions/users";

interface UsersContentProps {
  users: User[];
}
```

**Why it matters:**
- Components need types for proper TypeScript support
- Keeps types co-located with the data they represent
- Single source of truth for data shapes
