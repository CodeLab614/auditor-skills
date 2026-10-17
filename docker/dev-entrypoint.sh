#!/bin/sh
set -eu

cd /app

lock_hash="$(sha256sum bun.lock | sha256sum | cut -d ' ' -f 1)"
installed_hash="$(cat node_modules/.docker-bun-lock-hash 2>/dev/null || true)"

if [ "$lock_hash" != "$installed_hash" ]; then
  bun install --frozen-lockfile
  printf '%s\n' "$lock_hash" > node_modules/.docker-bun-lock-hash
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

bunx prisma db push
bun run db:seed
exec bunx next dev --turbopack --hostname 0.0.0.0
