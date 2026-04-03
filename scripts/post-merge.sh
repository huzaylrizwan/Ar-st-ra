#!/bin/bash
set -e
npm install

# Apply pending SQL migrations using a tracking table to avoid re-running
# migrations that have already been applied. Each migration file is idempotent,
# but we still track to be safe and avoid unnecessary work.
npx tsx scripts/run-migrations.ts

# Sync Drizzle schema — pipe empty input so any interactive prompts are
# auto-declined in non-TTY environments (CI/post-merge runner).
# Exits 0 when "No changes detected" or after applying changes.
yes "" | npm run db:push 2>&1
