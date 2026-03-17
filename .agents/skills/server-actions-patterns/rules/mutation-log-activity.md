---
title: Log user activities after mutations
impact: MEDIUM
tags: mutation, logging, activity
---

## Activity Logging After Mutations

Log user activities after successful mutations for audit trail.

**Incorrect:**

```typescript
export async function updateProfile(data: ProfileData) {
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });
    return { success: true };
    // No record of who changed what!
  } catch (error) {
    // ...
  }
}
```

**Correct:**

```typescript
import { logActivity } from "@/actions/activity-log";

export async function updateProfile(data: ProfileData): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name },
    });

    // Log the activity
    await logActivity(session.user.id, "profile_update", {
      field: "name",
      newValue: data.name,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
```

**Available activity actions:**
- `login`, `logout`, `register`
- `profile_update`, `password_change`, `email_change`
- `2fa_enabled`, `2fa_disabled`
- `session_revoked`

**Why it matters:**
- Creates audit trail for compliance
- Helps debug issues ("when did this change?")
- Enables activity feed features
- Security monitoring and anomaly detection
