## Agent Notes Template

Keep the real `AGENTS.md` and the accompanying `agents/` folder out of git. Copy this template outside of version control and fill it in for your session.

### Root Pointer (AGENTS.md)
- **Purpose:** act as the entry point. Link each subfile below and note the last update date.
- **Suggested sections:**
  - Summary of current objectives.
  - Links to `agents/overview.md`, `agents/environment.md`, `agents/status.md`, `agents/outstanding.md`, `agents/conventions.md`.

### `agents/overview.md`
- Project background, high-level goals, notable architectural constraints.
- Record any major decisions with dates.

### `agents/environment.md`
- Devcontainer/bootstrap instructions, credential loading, relevant scripts.
- Include command snippets for common tasks (build, run, test).

### `agents/status.md`
- Current environment state (service URLs, feature flags, data snapshots).
- Active users or tokens; keep secrets in `.env` files, not here.

### `agents/outstanding.md`
- TODO list for next session; include owner and context.
- Note blockers and required follow-ups.

### `agents/conventions.md`
- Formatting rules, scratch-space policy, communication cadence.
- Tips for committing, branch naming, or deployment etiquette.

### Usage Notes
- Sync these files at the start/end of each session.
- Remove stale entries; add timestamps for clarity.
- Never commit the real notes—`AGENTS.md` and `agents/` stay local and are ignored by git.
