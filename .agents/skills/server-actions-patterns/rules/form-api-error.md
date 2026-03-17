---
title: Handle APIError from better-auth
impact: MEDIUM
tags: form, error, better-auth
---

## Handle Better-Auth APIError

When using better-auth, handle `APIError` specifically for user-friendly messages.

**Incorrect:**

```typescript
export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    return { success: true };
  } catch (error) {
    return { error: "Something went wrong" };
    // Lost the specific error message from better-auth!
  }
}
```

**Correct:**

```typescript
import { APIError } from "better-auth/api";

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      // Use better-auth's error message (e.g., "Invalid credentials")
      return { error: error.message ?? "Login failed" };
    }
    return { error: "An unexpected error occurred" };
  }
}
```

**Common APIError messages from better-auth:**
- "Invalid credentials"
- "Email already exists"
- "Invalid token"
- "User not found"
- "Email not verified"

**Why it matters:**
- Better-auth provides specific, user-friendly error messages
- Users see relevant feedback (not generic errors)
- Maintains security (doesn't leak implementation details)
- Consistent error handling across auth flows
