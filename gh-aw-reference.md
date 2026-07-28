# GitHub Agentic Workflows — Session Reference

> This document captures the full setup, workflows, secrets, commands, and lessons from implementing `gh-aw` (GitHub Agentic Workflows) in the ZombieHunt repository. Use this as a reference when replicating the setup in another repository.

---

## 1. Prerequisites

### Install the gh-aw Extension
```bash
gh extension install github/gh-aw
```

### Authenticate GitHub CLI (required)
```bash
gh auth login --hostname github.com --git-protocol https --web
```
Then add Copilot scope:
```bash
gh auth refresh --hostname github.com --scopes copilot
```

### Verify auth
```bash
gh auth status
```

---

## 2. Core Concepts

| Term | What it is |
|---|---|
| `.md` workflow file | The human-readable prompt file you write and edit |
| `.lock.yml` file | Auto-compiled GitHub Actions YAML — **do NOT edit manually** |
| `gh aw add <registry/path>` | Downloads a pre-built workflow from the registry |
| `gh aw new <name>` | Creates a blank `.md` template for a custom workflow |
| `gh aw compile` | Compiles all `.md` files → `.lock.yml` files |
| `gh aw run <name>` | Manually triggers a workflow (uses local name, not registry path) |
| `gh aw status` | Lists all local workflows and their status |
| `COPILOT_GITHUB_TOKEN` | **Fine-grained PAT** required for the Copilot AI engine |

### Critical Lessons Learned

1. **`gh aw run` uses local name** — after `gh aw add githubnext/agentics/daily-repo-status`, run it as `gh aw run daily-repo-status` (not the registry path).
2. **`COPILOT_GITHUB_TOKEN` must be a fine-grained PAT** — classic PATs (`ghp_...`) are rejected. Must start with `github_pat_...`.
3. **Default model `claude-sonnet-4.6` requires Copilot Enterprise** — set `GH_AW_DEFAULT_MODEL_COPILOT = gpt-4o` for Individual/Business plans.
4. **`aw_context` input is internal** — leave it empty when manually triggering workflows.
5. **`gh aw compile` must be re-run after every `.md` edit** — the `.lock.yml` is not auto-updated.

---

## 3. Repository Secrets Required

Set all of these at: `github.com → repo → Settings → Secrets and variables → Actions`

### Mandatory (workflows will fail without these)

| Secret Name | Description | How to get it |
|---|---|---|
| `COPILOT_GITHUB_TOKEN` | Fine-grained PAT for the Copilot AI engine | github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** |

### Optional but Recommended

| Secret Name | Description | Fallback |
|---|---|---|
| `GH_AW_GITHUB_TOKEN` | Token for creating issues/comments | Falls back to built-in `GITHUB_TOKEN` |
| `GH_AW_GITHUB_MCP_SERVER_TOKEN` | Token for GitHub MCP server | Falls back to `GH_AW_GITHUB_TOKEN` |
| `VITE_SUPABASE_URL` | Supabase project URL (for CI build) | Build will fail without env vars |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (for CI build) | Build will fail without env vars |

### For Supabase Migration Workflow

| Secret Name | Where to get it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Your Supabase project DB password |
| `SUPABASE_PROJECT_ID` | From your project URL `https://app.supabase.com/project/<ID>` |

---

## 4. Repository Variables Required

Set at: `github.com → repo → Settings → Secrets and variables → Actions → Variables tab`

| Variable | Default | Purpose |
|---|---|---|
| `GH_AW_DEFAULT_MODEL_COPILOT` | `claude-sonnet-4.6` | AI model — set to `gpt-4o` if not on Enterprise |
| `GH_AW_DEFAULT_MAX_AI_CREDITS` | `1000` | Per-run AI credit cap |
| `GH_AW_DEFAULT_MAX_DAILY_AI_CREDITS` | `5000` | Daily total credit cap |
| `GH_AW_DEFAULT_MAX_TURNS` | unlimited | Max agent turns per run |

### Fine-grained PAT Permissions for `COPILOT_GITHUB_TOKEN`

When creating the fine-grained PAT at `https://github.com/settings/personal-access-tokens/new`:

| Permission | Level |
|---|---|
| Actions | Read and write |
| Contents | Read and write |
| Issues | Read and write |
| Metadata | Read-only (auto) |
| Pull requests | Read and write |

---

## 5. Workflows Created

### 5.1 `daily-repo-status` (from registry)

```bash
gh aw add githubnext/agentics/daily-repo-status
```

| Property | Value |
|---|---|
| Trigger | Daily schedule + `workflow_dispatch` |
| Purpose | AI generates daily repo health report as a GitHub issue |
| Output | Creates issue with `[report]` and `[daily-status]` labels |
| Engine | Copilot (`claude-sonnet-4.6` / `gpt-4o`) |

---

### 5.2 `ci-check` (custom — CI Doctor)

**Trigger:** push/PR to `main` or `dev` + `workflow_dispatch`

**What it does:**
- Scans recently changed files in `src/`, `supabase/`, and config files
- Categorizes failures into 6 types: type error / import / config drift / schema conflict / edge function / env var
- Searches existing `[ci-check]` issues to avoid duplicates
- Creates structured issue with root cause, reproduction steps, and suggested fix
- Posts inline comment on PRs

**Adapt for your repo — change these in the prompt body:**
- Build command (currently `tsc && vite build`)
- Source directories (currently `src/`, `supabase/`)
- Config files (currently `tsconfig.json`, `vite.config.ts`, `vercel.json`)
- Environment variables (currently `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

**Safe outputs used:** `create-issue` (max 3), `add-comment`, `update-issue`, `noop`

---

### 5.3 `supabase-migrate` (custom — Schema Drift Detector)

**Trigger:** push to `main` when `supabase/migrations/**` or `supabase/schema.sql` changes + `workflow_dispatch`

**What it does (3 phases):**
1. **Migration Review** — checks for destructive ops, missing RLS, missing indexes, unsafe patterns
2. **Schema Drift Detection** — compares `schema.sql` against TypeScript type definitions in `src/` and edge functions in `supabase/functions/`. Also checks README for doc drift.
3. **Report** — risk-rated issue (`🔴/🟡/🟢`) with verdict: safe / apply with caution / do not apply

**Adapt for your repo — change these in the prompt body:**
- Schema file path (currently `supabase/schema.sql`)
- TypeScript files to scan for DB types (currently `src/lib/supabase.ts`, `src/context/`, `src/store/`)
- Edge functions path (currently `supabase/functions/`)

**Safe outputs used:** `create-issue` (max 5), `noop`

---

### 5.4 `deploy-preview` (custom — Opinionated PR Reviewer)

**Trigger:** PR opened/synchronize/reopened + `workflow_dispatch`

**What it does:**
- Reviews PR diff with a direct, opinionated reviewer personality
- Checks: game logic correctness, Supabase realtime safety, React hooks correctness, TypeScript strictness, security
- Always posts a structured PR comment — never skips
- Comment format: Summary → Verdict → `🔴 CONCERN` / `🟡 SUGGESTION` per finding → What's Good

**Adapt for your repo — change these in the prompt body:**
- The reviewer personality / focus areas (currently: game logic, realtime, React, TypeScript, security)
- The specific files to check (currently: `src/store/gameStore.ts`, `src/lib/`, `supabase/functions/`)
- Domain-specific rules (currently: zombie/vaccine/shotgun card rules, win conditions)

**Safe outputs used:** `add-comment`, `noop`

---

## 6. Full Setup Commands (for a new repo)

```bash
# 1. Install extension
gh extension install github/gh-aw

# 2. Authenticate
gh auth login --hostname github.com --git-protocol https --web
gh auth refresh --hostname github.com --scopes copilot

# 3. Add registry workflow
gh aw add githubnext/agentics/daily-repo-status

# 4. Create custom workflows from templates
gh aw new ci-check --engine copilot
gh aw new supabase-migrate --engine copilot
gh aw new deploy-preview --engine copilot

# 5. Edit each .md file with your project-specific prompt
# (replace the body section after the closing ---)

# 6. Add workflow_dispatch to all triggers in frontmatter

# 7. Compile everything
gh aw compile

# 8. Push to GitHub
git add .github/workflows/
git commit -m "feat: add gh-aw agentic workflows"
git push

# 9. Set secrets in GitHub repo settings (see Section 3)
# 10. Set variables in GitHub repo settings (see Section 4)

# 11. Test manually
gh aw run daily-repo-status
gh aw run ci-check
```

---

## 7. Workflow File Structure

After setup, `.github/workflows/` will contain:

```
.github/workflows/
├── daily-repo-status.md          # Editable prompt
├── daily-repo-status.lock.yml    # Auto-generated — do not edit
├── ci-check.md
├── ci-check.lock.yml
├── supabase-migrate.md
├── supabase-migrate.lock.yml
├── deploy-preview.md
└── deploy-preview.lock.yml
```

**Gitignore:** Add `.aw/` to `.gitignore` (local gh-aw state folder).

---

## 8. Frontmatter Cheatsheet

Every `.md` workflow starts with a YAML frontmatter block:

```yaml
---
on:
  push:
    branches: [main, dev]
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:          # Always add this for manual testing

permissions:
  contents: read
  issues: read
  pull-requests: read

engine: copilot               # or: claude, codex, gemini

safe-outputs:
  create-issue:               # AI can create issues
    max: 3
  add-comment:                # AI can comment on PRs/issues
  update-issue:               # AI can update existing issues
  add-labels:                 # AI can add labels
    allowed: [bug, feature]
  noop:                       # AI can report "nothing to do"
  missing-tool:               # AI can report missing tools
  missing-data:               # AI can report missing data
---
```

---

## 9. Running Workflows Manually

```bash
# Run by local name (not registry path)
gh aw run daily-repo-status
gh aw run ci-check
gh aw run supabase-migrate
gh aw run deploy-preview

# Check status of all workflows
gh aw status

# Recompile after editing any .md file
gh aw compile
```

To trigger with a GitHub token inline (for testing before secrets are set):
```bash
GITHUB_TOKEN=<your-token> gh aw run <workflow-name>
```

---

## 10. Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `workflow not found in local .github/workflows` | Used registry path with `run` | Use local name: `gh aw run daily-repo-status` |
| `COPILOT_GITHUB_TOKEN is a classic PAT` | Used `ghp_...` token | Create fine-grained PAT at `github.com/settings/personal-access-tokens/new` |
| `400 The requested model is not supported` | Subscription doesn't include `claude-sonnet-4.6` | Set repo variable `GH_AW_DEFAULT_MODEL_COPILOT = gpt-4o` |
| `failed to get markdown workflow files: no .github/workflows directory found` | Directory doesn't exist yet | Run `gh aw add` or `gh aw new` first |
| `To get started with GitHub CLI, please run: gh auth login` | Not authenticated | Run `gh auth login` |
| Fuzzy schedule scattering warning | No git remote configured | `git remote add origin <url>` then recompile |
