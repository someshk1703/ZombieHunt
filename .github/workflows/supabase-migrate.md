---
# Trigger - when should this workflow run?
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
      - 'supabase/schema.sql'
  workflow_dispatch:

# Alternative triggers (uncomment to use):
# on:
#   issues:
#     types: [opened, reopened]
#   pull_request:
#     types: [opened, synchronize]
#   schedule: daily  # Fuzzy daily schedule (scattered execution time)
#   # schedule: weekly on monday  # Fuzzy weekly schedule

# Permissions - what can this workflow access?
# Write operations (creating issues, PRs, comments, etc.) are handled
# automatically by the safe-outputs job with its own scoped permissions.
permissions:
  contents: read
  issues: read
  pull-requests: read

# AI engine to use for this workflow
engine: copilot

# Tools - GitHub API access via toolsets (context, repos, issues, pull_requests)
# tools:
#   github:
#     toolsets: [default]

# Network access
network: defaults

# Outputs - what APIs and tools can the AI use?
safe-outputs:
  create-issue:          # Creates migration review issues
    max: 5
  noop:
  missing-tool:
  missing-data:
  # actions:
  # activation-comments:
  # add-comment:
  # add-labels:
  # add-reviewer:
  # allowed-github-references:
  # assign-milestone:
  # assign-to-agent:
  # assign-to-user:
  # autofix-code-scanning-alert:
  # call-workflow:
  # close-discussion:
  # close-issue:
  # close-pull-request:
  # concurrency-group:
  # create-agent-session:
  # create-agent-task:
  # create-check-run:
  # create-code-scanning-alert:
  # create-discussion:
  # create-project:
  # create-project-status-update:
  # create-pull-request:
  # create-pull-request-review-comment:
  # dispatch-workflow:
  # dispatch_repository:
  # environment:
  # failure-issue-repo:
  # footer:
  # group-reports:
  # hide-comment:
  # id-token:
  # link-sub-issue:
  # mark-pull-request-as-ready-for-review:
  # max-bot-mentions:
  # max-patch-files:
  # mentions:
  # merge-pull-request:
  # missing-data:
  # missing-tool:
  # noop:
  # push-to-pull-request-branch:
  # remove-labels:
  # replace-label:
  # reply-to-pull-request-review-comment:
  # report-failure-as-issue:
  # report-incomplete:
  # resolve-pull-request-review-thread:
  # scripts:
  # set-issue-field:
  # set-issue-type:
  # steps:
  # submit-pull-request-review:
  # threat-detection:
  # unassign-from-user:
  # update-discussion:
  # update-issue:
  # update-project:
  # update-pull-request:
  # update-release:
  # upload-artifact:
  # upload-asset:
  # urls:

---

# Supabase Migration & Schema Drift Detector

This workflow triggers when SQL migration files change in the ZombieHunt project (a Vite + React + TypeScript multiplayer zombie card game using Supabase as its backend).

## Context

The project schema is defined in `supabase/schema.sql`. Edge functions live in `supabase/functions/`. TypeScript types that mirror DB tables are used throughout `src/` (especially `src/lib/supabase.ts`, `src/context/GameContext.tsx`, `src/store/gameStore.ts`). The README.md documents the data model.

## Phase 1 — Migration Review

1. Fetch the list of recently changed files in `supabase/migrations/`.
2. Read each new or modified `.sql` migration file.
3. Review each migration for:
   - Destructive operations (DROP TABLE, DROP COLUMN, TRUNCATE) that could cause data loss
   - Missing RLS (Row Level Security) policies for any new tables
   - Missing indexes on foreign key columns
   - Syntax errors or dangerous patterns (e.g. no WHERE clause on DELETE)
   - Whether the migration is reversible (can it be rolled back safely?)

## Phase 2 — Schema Drift Detection

4. Read `supabase/schema.sql` as the source of truth for the current DB schema.
5. Scan these TypeScript files for type definitions that mirror DB tables:
   - `src/lib/supabase.ts`
   - `src/context/GameContext.tsx`
   - `src/store/gameStore.ts`
   - Any `*.ts` or `*.tsx` file in `src/` that imports from `@supabase/supabase-js`
6. Detect drift between schema and code:
   - **Column drift** — columns in SQL schema not reflected in TypeScript types
   - **Table drift** — tables in SQL with no corresponding TS interface or type
   - **Function drift** — Supabase edge functions in `supabase/functions/` that reference columns/tables no longer in schema
   - **README drift** — data model section in README.md that doesn't match current schema
7. Check if any migration adds/renames/removes a column that is referenced by name in TypeScript files (string literals like `'zombie_card'`, `'player_id'`).

## Phase 3 — Report

8. Create a GitHub issue titled `[supabase-migrate] Schema review: <migration filename>` with:
   - **Migration summary** — what the migration does in plain English
   - **Drift findings** — list of each drift found across code/docs/functions with file + line references
   - **Risk level** — 🔴 High / 🟡 Medium / 🟢 Low
   - **Verdict** — ✅ safe to apply, ⚠️ apply but fix drift after, or 🔴 do not apply until drift is resolved
9. If no migration changes and running via workflow_dispatch, perform a full schema drift scan across all files and report findings as an issue titled `[supabase-migrate] Full schema drift scan`.
10. If everything is consistent, use noop with a confirmation.

## Notes

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
