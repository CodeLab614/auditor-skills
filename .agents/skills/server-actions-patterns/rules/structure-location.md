---
title: Actions Location - actions/ folder only
impact: CRITICAL
tags: structure, folder, organization
---

## Actions Location

All server actions MUST be placed in the `actions/` folder at the root of the project.

**Incorrect (wrong locations):**

```
lib/actions/users.ts      ❌
app/actions/users.ts      ❌
src/actions/users.ts      ❌
app/dashboard/page.tsx    ❌ (inline function)
```

**Correct:**

```
actions/
├── users.ts              ✅
├── dashboard.ts          ✅
├── auth/
│   └── login.ts          ✅
└── activity.ts           ✅
```

**Why it matters:**
- Consistent location makes actions easy to find
- Separates data layer from presentation layer
- Prevents confusion about where to add new actions
