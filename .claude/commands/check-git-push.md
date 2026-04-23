# /check-git-push

Pre-push gate for FLOW-3D. Run this before every `git commit` and `git push`.
Work through all five phases in order. Do not skip a phase even if the previous one
looks clean — each phase catches a different class of problem.

---

## Phase 1 — Snapshot the working tree

Run these three commands and hold all output in context for the rest of the skill:

```bash
git status --short
git diff --cached          # staged changes (what will actually be committed)
git diff                   # unstaged changes (will NOT be committed)
```

Also record the current branch and the upstream tracking branch:

```bash
git branch -vv
git log --oneline -10
```

---

## Phase 2 — .gitignore audit

### 2a. Check for untracked files that should be ignored

For every file that appears as `??` (untracked) in `git status --short`, decide
whether it should be committed or added to `.gitignore`. Apply the following rules:

| Pattern | Decision |
| ------- | -------- |
| `venv/`, `.venv/`, `__pycache__/`, `*.pyc`, `*.pyo` | Must be in `.gitignore` — never commit |
| `.env` (any `.env.*` except `.env.example`) | Must be in `.gitignore` — contains secrets |
| `gurobi.log`, `*.rlp` | Must be in `.gitignore` — Gurobi artefacts |
| `node_modules/`, `dist/`, `.vite/` | Must be in `.gitignore` — build artefacts |
| `Thumbs.db`, `desktop.ini`, `.DS_Store`, `.AppleDouble`, `.LSOverride` | Must be in `.gitignore` — OS noise |
| `.claude/settings.local.json` | Must be in `.gitignore` — personal overrides |
| `*.log` (unless explicitly a project log) | Should be in `.gitignore` |
| Any file containing a secret pattern (API key, password, token, licence file) | BLOCK push — report and stop |

### 2b. Check staged files against .gitignore

For every file in the staged set (`git diff --cached --name-only`), verify it does
not match any of the patterns above. If it does, report a **BLOCKER** and stop.

### 2c. Report .gitignore gaps

If an untracked file should be ignored but is not currently in `.gitignore`, output
the exact line to add and offer to append it automatically.

---

## Phase 3 — Readiness checks

Run each check and report PASS / WARN / BLOCK per item.

### 3a. Backend lint (if any `.py` file is staged)

```bash
cd backend && source venv/Scripts/activate && ruff check .
```

On macOS use `source venv/bin/activate`. A BLOCK if ruff reports errors.

### 3b. Backend tests (if any backend file is staged)

```bash
cd backend && source venv/Scripts/activate && python -m pytest tests/ -q
```

A BLOCK if any test fails.

### 3c. Frontend type check (if any `.ts` or `.tsx` file is staged)

```bash
cd frontend && npx tsc --noEmit
```

A BLOCK if tsc exits non-zero.

### 3d. Secret / credential scan

Search staged file contents for high-risk patterns:

```bash
git diff --cached | grep -iE \
  "(api_key|secret|password|token|private_key|license_file|GUROBI_LICENSE)\s*=\s*\S+"
```

A BLOCK on any match. The only allowed exception is `.env.example` with placeholder
values.

### 3e. Conflict marker scan

```bash
git diff --cached | grep -E "^(\+.*(<<<<<<<|=======|>>>>>>>))"
```

A BLOCK if any conflict markers are found.

### 3f. Large-file warning

Flag any staged file larger than 1 MB (binary or not) with a WARN. Flag files larger
than 5 MB as a BLOCK — these almost certainly belong in `.gitignore` or Git LFS.

```bash
git diff --cached --name-only | xargs -I{} du -k "{}" 2>/dev/null | sort -rn | head -10
```

---

## Phase 4 — Commit message generation

Using the full diff from Phase 1, generate a commit message in this exact format:

```
<type>(<scope>): <short imperative summary — 72 chars max>

<body — bullet list, one bullet per logical change>
- <file or module>: <what changed and why, citing thesis section if relevant>
- ...

<footer — include only the lines that apply>
Thesis ref: section <X.X.X> — <constraint or algorithm name>
Breaking change: <description if API contract changed>
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**Type** choices:
| Type | When to use |
| ---- | ----------- |
| `feat` | New feature or solver path |
| `fix` | Bug or constraint violation fix |
| `refactor` | Internal restructure, no behaviour change |
| `test` | Adding or fixing tests |
| `docs` | CLAUDE.md, README, thesis references |
| `chore` | Dependency, config, tooling |
| `style` | Formatting only (ruff, prettier) |

**Scope** choices: `ilp`, `ffd`, `validator`, `api`, `frontend`, `viewer`, `dashboard`,
`config`, `deps`, `docs`.

Rules for the body:
- Reference thesis sections (e.g. "section 3.5.2.1 B") for any constraint or
  algorithm change.
- Use thesis variable names (`x_i`, `l_i`, `V_util`, `s_ij_k`, etc.) when describing
  coordinate or solver changes — see CLAUDE.md variable naming table.
- If a Placement or PackingPlan contract field changed, explicitly name the old and new
  field name/type.
- Keep each bullet to one sentence.

---

## Phase 5 — Final report

Output a structured report in this order:

```
══════════════════════════════════════════════
  FLOW-3D — Pre-Push Check
══════════════════════════════════════════════

BRANCH:   <current branch>  →  <upstream>
STAGED:   <N> file(s)   UNSTAGED: <M> file(s)   UNTRACKED: <K> file(s)

── .gitignore audit ──────────────────────────
<PASS or list of gaps / blockers>

── Readiness checks ──────────────────────────
  lint         PASS | BLOCK (<error>)
  tests        PASS | BLOCK (<N failed>)
  types        PASS | BLOCK (<error>)
  secrets      PASS | BLOCK (<match>)
  conflicts    PASS | BLOCK
  large files  PASS | WARN (<file> <size>)

── Commit message ────────────────────────────
<generated commit message, ready to copy>

── Verdict ───────────────────────────────────
  ✅  SAFE TO COMMIT AND PUSH
  or
  🚫  BLOCKED — fix the issues above before pushing
══════════════════════════════════════════════
```

If the verdict is SAFE, offer to run:

```bash
git add <staged files>
git commit -m "<generated message>"
```

If the verdict is BLOCKED, list every blocker with the exact file and line number
where possible, and suggest the minimal fix for each.
