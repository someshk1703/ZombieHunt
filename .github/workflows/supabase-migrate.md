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

# Supabase Migration Reviewer

This workflow triggers when SQL migration files change in the ZombieHunt project (a Vite + React + TypeScript multiplayer zombie card game using Supabase as its backend).

## Instructions

1. Fetch the list of recently changed files in `supabase/migrations/` from this push.
2. Read the content of each new or modified `.sql` migration file.
3. Review each migration for:
   - Syntax issues or potential errors
   - Destructive operations (DROP TABLE, DROP COLUMN, TRUNCATE) that could cause data loss
   - Missing RLS (Row Level Security) policies for new tables
   - Conflicts with existing schema defined in `supabase/schema.sql`
   - Missing indexes on foreign key columns
4. Cross-reference with `supabase/schema.sql` to verify consistency.
5. Create a GitHub issue titled `[supabase-migrate] Migration review: <filename>` with:
   - A summary of what the migration does
   - Any risks or warnings found
   - Suggested improvements if applicable
   - A ✅ safe to apply or ⚠️ review before applying recommendation
6. If no issues are found, post a noop confirmation that migrations look clean.

## Notes

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
