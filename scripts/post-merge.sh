#!/bin/bash
set -e
npm install

# Apply any pending SQL migrations from the migrations/ directory
# These are idempotent (CREATE IF NOT EXISTS / DO blocks) so safe to re-run
for f in migrations/*.sql; do
  if [ -f "$f" ]; then
    echo "Applying migration: $f"
    npx tsx -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(fs.readFileSync('$f', 'utf8')).then(() => { console.log('OK'); pool.end(); }).catch(e => { console.error(e.message); pool.end(); process.exit(1); });
"
  fi
done

# Sync schema — pipe empty input to auto-decline any interactive prompts
# If schema is already in sync this exits immediately with "No changes detected"
yes "" | npm run db:push 2>&1 || true
