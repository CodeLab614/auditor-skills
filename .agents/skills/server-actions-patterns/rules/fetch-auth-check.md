---
title: Check authentication for protected data
impact: HIGH
tags: fetch, auth, session
---

## Authentication Check for Protected Data

Always verify the session before fetching protected data.

**Incorrect:**

```typescript
export async function getUserProfile(userId: string) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    return { success: true, data: profile };
    // Anyone can fetch any user's profile!
  } catch (error) {
    // ...
  }
}
```

**Correct:**

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getUserProfile(): Promise<
  { success: true; data: Profile } | { success: false; error: string }
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const profile = await prisma.user.findUnique({
      where: { id: session.user.id }, // Use session user ID
      include: { settings: true },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    return { success: true, data: transformProfile(profile) };
  } catch (error) {
    console.error("Failed to get profile:", error);
    return { success: false, error: "Failed to get profile" };
  }
}
```

**Why it matters:**
- Prevents unauthorized data access
- Uses authenticated user's ID, not user-provided ID
- Protects sensitive user data
- Consistent security pattern across all protected actions
