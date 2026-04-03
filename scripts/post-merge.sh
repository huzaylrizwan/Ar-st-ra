#!/bin/bash
set -e
npm install

# Apply pending SQL migrations using a tracking table to avoid re-running
# migrations that have already been applied. Each migration file is idempotent,
# but we still track to be safe and avoid unnecessary work.
npx tsx scripts/run-migrations.ts

# Sync Drizzle schema non-interactively.
# --force auto-approves any data-loss statements (safe here because our
# migration SQL already handles all structural changes idempotently).
npm run db:push -- --force
