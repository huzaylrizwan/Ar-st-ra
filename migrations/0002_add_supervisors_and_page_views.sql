-- Migration: Add supervisors and page_views tables
-- Task #13: Supervisor portal - email invites, contact/product management, live visitor counter

-- supervisors: stores whitelisted email addresses for supervisor portal access
CREATE TABLE IF NOT EXISTS supervisors (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  added_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- page_views: tracks visitor sessions for live visitor counter
-- "Live visitors" = distinct session_ids with viewed_at in last 10 minutes
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for efficient live visitor queries (filter by viewed_at)
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views (viewed_at);
