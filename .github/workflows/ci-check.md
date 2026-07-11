---
# Trigger - when should this workflow run?
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
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
  create-issue:          # Creates failure investigation issues
    max: 3
  add-comment:           # Comments on PRs with inline findings
  update-issue:          # Updates existing [ci-check] issues instead of duplicating
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

# CI Doctor — Auto-Investigation on Failure

This workflow runs on every push and pull request to `main` or `dev` branches of the ZombieHunt project (a Vite + React + TypeScript multiplayer game with Supabase backend). It acts as a first-responder: when a build or type check fails, it automatically investigates, diagnoses the root cause, and creates a structured failure report.

## Context

- Build command: `tsc && vite build` (via `npm run build`)
- Type check: `npx tsc --noEmit`
- Config files: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
- Environment variables needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Supabase edge functions in: `supabase/functions/`

## Phase 1 — Health Scan

1. Fetch the most recent commits on this branch (last 3).
2. List changed files in the latest commit across `src/`, `supabase/`, and root config files.
3. For each changed file category, perform a targeted scan:

   **TypeScript / React (`src/`)**
   - Look for broken imports — does every import path resolve to an existing file?
   - Look for components using hooks outside of function components
   - Look for missing `export` on components referenced in routes (`src/pages/`)
   - Look for Zustand store actions called with wrong argument types
   - Look for `useEffect` with no dependency array on Supabase subscriptions (memory leak)

   **Build config (`vite.config.ts`, `tsconfig.json`)**
   - Check if any path alias in `tsconfig.json` is missing a corresponding `vite.config.ts` resolve alias
   - Check if `outDir` in vite config matches `outputDirectory` in `vercel.json` (`dist`)

   **Supabase (`supabase/functions/`, `supabase/migrations/`)**
   - Check if new edge function files export a default `serve()` handler
   - Check if any migration references a table/column that doesn't exist in `supabase/schema.sql`

## Phase 2 — Failure Investigation

4. Search open GitHub issues for any recent `[ci-check]` issues on this repo to avoid duplicate reports.
5. Check if the same type of failure was seen before — if a similar issue exists and is open, add a comment to it instead of creating a new one.
6. Determine root cause category:
   - **Type error** — TypeScript compilation failure
   - **Import error** — missing module or wrong path
   - **Config drift** — mismatch between tsconfig, vite config, or vercel.json
   - **Schema conflict** — new migration conflicts with existing schema or TS types
   - **Edge function error** — malformed Supabase edge function
   - **Environment variable** — missing or wrong VITE_ prefix

## Phase 3 — Report

7. **If failures are found**, create a GitHub issue titled `[ci-check] ❌ Build failure: <root cause category> on <branch>` with:
   - **Trigger** — which commit and which files changed caused this
   - **Root cause** — specific file, line, and explanation of the failure
   - **Category** — one of the 6 categories above
   - **Reproduction steps** — exact command to reproduce locally
   - **Suggested fix** — concrete code change or configuration fix
   - **Similar past issues** — links to any related `[ci-check]` issues found
   - **Severity** — 🔴 Blocks deploy / 🟡 Warning only

8. **If no failures are found**, use noop with: `✅ CI health check passed on <branch> — no issues detected in changed files.`

## Notes

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
