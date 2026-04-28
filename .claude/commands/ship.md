# /ship

Single pre-push gate for FLOW-3D. Replaces the previous `/check-git-push` and
`/update-changelog` commands. Run this before every `git commit` and `git push`.

The command has two modes, selected by the argument you pass:

| Invocation       | Mode             | What runs                                                |
| ---------------- | ---------------- | -------------------------------------------------------- |
| `/ship`          | **commit mode**  | Phases 1 → 4 → 6 (skip changelog + tag)                  |
| `/ship release`  | **release mode** | Phases 1 → 6 (full flow: checks + changelog + tag)       |

Use `commit mode` for routine pushes during a sprint. Use `release mode` when
closing a sprint or tagging a version. Work through every phase in order — do
not skip a phase even if the previous one looked clean. Each phase catches a
different class of problem.

---

## Phase 1 — Snapshot the working tree

Run these commands and hold all output in context for the rest of the skill:

```bash
git status --short
git diff --cached          # staged changes (what will actually be committed)
git diff                   # unstaged changes (will NOT be committed)
git branch -vv
git log --oneline -10
git log --pretty=format:"%H|%ad|%s|%an" --date=short
git tag --sort=-version:refname
```

Also read the current `CHANGELOG.md` so you know what is already documented and
where the `[Unreleased]` section ends. (Reading is cheap; only Phase 5 actually
modifies the file, and only in release mode.)

---

## Phase 2 — .gitignore audit

### 2a. Check for untracked files that should be ignored

For every file that appears as `??` (untracked) in `git status --short`, decide
whether it should be committed or added to `.gitignore`. Apply the following rules:

| Pattern | Decision |
| ------- | -------- |
| `venv/`, `.venv/`, `__pycache__/`, `*.pyc`, `*.pyo` | Must be in `.gitignore` — never commit |
| `.env` (any `.env.*` except `.env.example`) | Must be in `.gitignore` — contains secrets |
| `gurobi.log`, `*.rlp`, `gurobi.lic` | Must be in `.gitignore` — Gurobi artefacts/license |
| `node_modules/`, `dist/`, `.vite/` | Must be in `.gitignore` — build artefacts |
| `Thumbs.db`, `desktop.ini`, `.DS_Store`, `.AppleDouble`, `.LSOverride` | Must be in `.gitignore` — OS noise |
| `.claude/settings.local.json` | Must be in `.gitignore` — personal overrides |
| `*.log` (unless explicitly a project log) | Should be in `.gitignore` |
| Any file containing a secret pattern (API key, password, token, licence file) | BLOCK push — report and stop |

### 2b. Check staged files against .gitignore

For every file in the staged set (`git diff --cached --name-only`), verify it
does not match any of the patterns above. If it does, report a **BLOCKER** and
stop.

### 2c. Report .gitignore gaps

If an untracked file should be ignored but is not currently in `.gitignore`,
output the exact line to add and offer to append it automatically.

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
  "(api_key|secret|password|token|private_key|license_file|GUROBI_LICENSE|WLSACCESSID|WLSSECRET)\s*=\s*\S+"
```

A BLOCK on any match. The only allowed exception is `.env.example` with
placeholder values.

### 3e. Conflict marker scan

```bash
git diff --cached | grep -E "^(\+.*(<<<<<<<|=======|>>>>>>>))"
```

A BLOCK if any conflict markers are found.

### 3f. Large-file warning

Flag any staged file larger than 1 MB (binary or not) with a WARN. Flag files
larger than 5 MB as a BLOCK — these almost certainly belong in `.gitignore` or
Git LFS.

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
| `perf` | Performance work without API change |

**Scope** choices: `ilp`, `ffd`, `validator`, `api`, `frontend`, `viewer`,
`dashboard`, `config`, `deps`, `docs`.

Rules for the body:

- Reference thesis sections (e.g. "section 3.5.2.1 B") for any constraint or
  algorithm change.
- Use thesis variable names (`x_i`, `l_i`, `V_util`, `s_ij_k`, etc.) when
  describing coordinate or solver changes — see CLAUDE.md variable naming table.
- If a Placement or PackingPlan contract field changed, explicitly name the old
  and new field name/type.
- Keep each bullet to one sentence.

**In commit mode, stop after generating the message and skip to Phase 6.**
**In release mode, continue to Phase 5.**

---

## Phase 5 — Changelog update + tag (release mode only)

Skip this phase entirely in commit mode.

### 5a. Classify every commit since the last tag

For each commit returned by `git log` in Phase 1, do the following.

**Parse the type from the conventional-commit prefix:**

| Prefix in subject | Changelog section |
| ----------------- | ----------------- |
| `feat`            | Added             |
| `fix`             | Fixed             |
| `refactor`        | Changed           |
| `style`           | Changed           |
| `docs`            | Changed           |
| `chore`           | Changed           |
| `test`            | Added             |
| `perf`            | Changed           |
| No prefix / free text | infer from subject wording: "add/create/implement" → Added, "fix/correct/resolve" → Fixed, "remove/delete/drop" → Removed, everything else → Changed |

**Build a human-readable bullet for each commit using this template:**

```
- `<scope or file>`: <imperative sentence describing the change>.
  Thesis ref: section <X.X.X> — <constraint or algorithm> (omit if not applicable)
```

Rules:

- Use thesis variable names (`x_i`, `l_i`, `w_i`, `h_i`, `V_util`, `s_ij_k`,
  `b_i`, `L`, `W`, `H`, `T_exec`) when the change touches solver or coordinate
  logic.
- If a Placement or PackingPlan contract field was added, renamed, or removed,
  state the old and new name/type explicitly.
- If the commit message already has a bullet list in the body, expand each
  bullet into its own changelog line.
- Merge trivial commits (e.g. "fix typo", "fix whitespace") into the nearest
  related entry rather than creating standalone lines.

**Group commits by sprint.** A sprint boundary is one of:

1. An existing git tag (e.g. `v0.1.0`, `sprint-1`).
2. A cluster of commits that share a coherent theme and span ≤ 2 calendar weeks.
3. A commit whose subject contains "sprint", "milestone", or "release".

If no tag exists yet, group all undocumented commits into the current sprint
block.

### 5b. Update CHANGELOG.md

The file must always follow this layout (do not change the header or template
comment):

```
# FLOW-3D — Sprint Log & Changelog

<intro paragraph — do not modify>

---

## [Unreleased]
> Add new entries here as you work. Move to a sprint block when the sprint ends.
### Added / Changed / Fixed / Removed
(entries for work not yet tagged)

---

## Sprint N — YYYY-MM-DD · <sprint goal title>
**Goal:** <one sentence>
### Added / Changed / Fixed / Removed
(entries)

---

## Sprint N-1 — ...
...
```

Placement rules:

- Commits that already appear in an existing dated sprint block must NOT be
  duplicated.
- Commits newer than the latest tag go into `[Unreleased]` if they have not
  been grouped into a sprint yet.
- When closing a sprint, move all `[Unreleased]` entries into a new dated
  sprint block and clear `[Unreleased]`.
- Omit empty sections (e.g. do not write `### Removed\n-` if nothing was
  removed).
- Sort entries within each section: solver/backend first, frontend second,
  config/docs last.

Produce the complete updated `CHANGELOG.md` and write it using the Write tool.
Do not summarise — write the full file every time.

### 5c. Determine the next tag

Apply semver based on commits since the last tag:

- `feat` commits → bump **minor** (0.X.0)
- Only `fix`, `style`, `docs`, `chore`, `perf` → bump **patch** (0.0.X)
- Any commit with `Breaking change:` in its footer → bump **major** (X.0.0)
- If no tags exist at all, start at `v0.1.0`.

Map sprint tags to versions: `sprint-1` = `v0.1.0`, `sprint-2` = `v0.2.0`, etc.

### 5d. Propose the tag

Output the proposed tag and a one-line annotation before running any git
command. Ask the user to confirm before running:

```bash
git tag -a v0.X.0 -m "Sprint X — <goal title>"
```

Do NOT push the tag automatically. After creating it locally, tell the user:

```bash
git push origin v0.X.0
```

---

## Phase 6 — Final report

Output a structured report in this format. Include the **Changelog & Tag**
block only in release mode.

```
══════════════════════════════════════════════
  FLOW-3D — /ship  (mode: commit | release)
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

── Changelog & Tag (release mode only) ───────
  Commits processed:    <N>
  Already documented:   <N>
  New entries added:    <N>
  [Unreleased] entries: <N>
  Sprint <N> block:     <new | appended>
  Proposed tag:         v0.X.0  "<annotation>"
  Status:               awaiting your confirmation

── Verdict ───────────────────────────────────
  ✅  SAFE TO COMMIT AND PUSH
  or
  🚫  BLOCKED — fix the issues above before pushing
══════════════════════════════════════════════
```

If the verdict is **SAFE in commit mode**, offer:

```bash
git add <staged files>
git commit -m "<generated message>"
```

If the verdict is **SAFE in release mode**, offer the same plus:

```bash
git add CHANGELOG.md && git commit -m "docs(config): update changelog for v0.X.0"
git tag -a v0.X.0 -m "Sprint X — <goal title>"
git push origin v0.X.0
```

If the verdict is **BLOCKED**, list every blocker with the exact file and line
number where possible, and suggest the minimal fix for each. Do not run any
commit, tag, or push commands.
