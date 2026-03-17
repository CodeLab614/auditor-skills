---
title: Call actions in page.tsx, pass data to components
impact: MEDIUM
tags: integration, page, component
---

## Page Calls Action Pattern

Call server actions in page.tsx (Server Component), then pass data to Client Components.

**Incorrect:**

```typescript
// app/dashboard/users/page.tsx
import { UsersContent } from "@/components/dashboard";

export default function UsersPage() {
  // No data fetching! Component has to fetch
  return <UsersContent />;
}

// components/dashboard/users-content.tsx
"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/actions/users";

export function UsersContent() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers().then(result => {
      if (result.success) setUsers(result.data);
    });
  }, []);
  // Client-side fetching causes loading states, waterfalls
}
```

**Correct:**

```typescript
// app/dashboard/users/page.tsx
import { UsersContent } from "@/components/dashboard";
import { getUsers } from "@/actions/users";

export default async function UsersPage() {
  const result = await getUsers();

  if (!result.success) {
    return <div className="p-4 text-destructive">Error: {result.error}</div>;
  }

  return <UsersContent users={result.data} />;
}

// components/dashboard/users-content.tsx
"use client";

import type { User } from "@/actions/users";

interface UsersContentProps {
  users: User[];
}

export function UsersContent({ users }: UsersContentProps) {
  // Data already available, no loading state needed
  return <DataTable data={users} />;
}
```

**Why it matters:**
- Server-side data fetching is faster (no round trip)
- No loading spinners for initial data
- SEO-friendly (data in initial HTML)
- Proper separation of concerns
