# Agent Working Notes

This file is the jump-off point for our internal operating manual. Keep it concise and use the topic-specific docs under `agents/` for details.

## How to Use These Notes
1. **Start Here:** skim this file at the beginning of a session so you know where to look next.
2. **Drill into Topics:** use the `agents/` subfolder for focused guidance:
   - `agents/overview.md` – project history, objectives, and patching strategy.
   - `agents/environment.md` – dev container flow, bootstrap automation, and tooling.
   - `agents/status.md` – current state of the stack (world, users, passwords, etc.).
   - `agents/outstanding.md` – active TODOs and future work.
   - `agents/conventions.md` – formatting rules, scratch-space policy, and update etiquette.
3. **Keep It Fresh:** whenever something changes, update the relevant sub-file and note the date if it helps future-you.
4. **Stay Organized:** new topics get their own markdown file under `agents/`—link them here so nothing gets lost.

## Baseline Reminders
- Prefer automation (REST or scripts) over manual UI steps; fall back to Playwright only when there is no API hook.
- Keep secrets and environment tweaks inside `.devcontainer/foundry/.env`.
- Document new behaviours in the appropriate `agents/` file as soon as you discover them.
- Before finishing a session, glance at `agents/outstanding.md` to ensure next actions are recorded.
