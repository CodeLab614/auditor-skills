---
title: Always use "use server" directive
impact: CRITICAL
tags: structure, directive, server
---

## Use Server Directive

Every action file MUST start with the `"use server"` directive.

**Incorrect:**

```typescript
import { prisma } from "@/lib/prisma";

export async function getUsers() {
  // This won't work as a server action!
}
```

**Correct:**

```typescript
"use server";

import { prisma } from "@/lib/prisma";

export async function getUsers() {
  // Now this is a proper server action
}
```

**Why it matters:**
- Without `"use server"`, functions are not treated as server actions
- Next.js requires this directive to enable RPC-style calls from client
- Missing directive causes runtime errors or unexpected behavior
