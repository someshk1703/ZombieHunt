---
# Trigger - when should this workflow run?
on:
  pull_request:
    types: [opened, synchronize, reopened]
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
  add-comment:           # Posts a comment on the pull request
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

# PR Code Review & Deploy Summary

This workflow triggers on every pull request to the ZombieHunt project (a Vite + React + TypeScript multiplayer zombie card game). It reviews the PR diff and posts a helpful summary comment.

## Instructions

1. Fetch the pull request details: title, description, changed files, and diff.
2. Review the changed files focusing on:
   - React component correctness (hooks rules, missing dependencies in useEffect, etc.)
   - TypeScript type safety issues in `src/`
   - Supabase query correctness in `src/lib/` and `src/hooks/`
   - Zustand store changes in `src/store/gameStore.ts` for state logic issues
   - Any new Supabase edge functions in `supabase/functions/` for security issues
   - Tailwind class correctness and responsive design concerns
3. Check if the PR description explains the change clearly.
4. Add a comment on the pull request with:
   - A brief summary of what the PR does
   - Key files changed and why they matter
   - Any concerns or suggestions (label as 🟡 suggestion or 🔴 concern)
   - An overall verdict: ✅ Looks good, ⚠️ Minor issues, or 🔴 Needs changes
5. Keep the review concise and focused — avoid nitpicking style unless it affects correctness.

## Notes

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
