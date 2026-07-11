---
# Trigger - when should this workflow run?
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

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
  create-issue:          # Creates issues (default max: 1)
    max: 5               # Optional: specify maximum number
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

# CI Health Check

This workflow runs on every push and pull request to `main` or `dev` branches of the ZombieHunt project (a Vite + React + TypeScript multiplayer game with Supabase backend).

## Instructions

1. Check the repository for any recent changes in `src/`, `supabase/`, or root config files.
2. Review TypeScript files for type errors, missing imports, or broken component references.
3. Look for any obvious build issues such as missing environment variables, broken imports, or misconfigured Vite/Tailwind/PostCSS settings.
4. Check if `supabase/migrations/` has any new SQL files that may conflict with existing schema in `supabase/schema.sql`.
5. Summarize findings as a concise report:
   - ✅ if everything looks healthy
   - ⚠️ if there are warnings or potential issues
   - ❌ if there are breaking problems that need attention
6. If issues are found, create a GitHub issue titled `[ci-check] Build health issues found` with details and suggested fixes.
7. If everything is healthy, use noop with a brief confirmation message.

## Notes

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
