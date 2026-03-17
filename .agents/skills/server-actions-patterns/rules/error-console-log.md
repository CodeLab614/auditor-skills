---
title: Always console.error before returning error
impact: CRITICAL
tags: error, logging, debugging
---

## Console Error Logging

Always log errors with `console.error` before returning the error response.

**Incorrect:**

```typescript
try {
  // ...
} catch (error) {
  return { success: false, error: "Failed to get users" };
  // Error details lost! No way to debug
}
```

**Correct:**

```typescript
try {
  // ...
} catch (error) {
  console.error("Failed to get users:", error);
  return { success: false, error: "Failed to get users" };
}
```

**Why it matters:**
- Server logs capture the actual error for debugging
- User sees a friendly message, not technical details
- Production issues can be diagnosed from logs
- Error context (stack trace, message) is preserved
