# prompts/ — the agent's versioned instructions

The agent's standing instructions live here as PR-reviewable files, never box-local
edits (agent-host-runbook §5). Assembly order for any drafting task:

1. `system-parish-voice.md` — who we are, how we sound (standing, every task)
2. `guardrails.md` — theological + safety rules (standing, every task)
3. `tasks/<task>.md` — the one task's inputs and output contract

Distilled from `catholic-church/templates/parish-context-for-claude.md` (the full parish
briefing — update that first, then re-distill here) and the guardrails in
`catholic-church/context/ai-bulletin-newsletter-system.md`.

| Task file | Fills issue.json field(s) | Model |
| --- | --- | --- |
| `tasks/reflection.md` | `reflection.body`, `reflection.question`, `hero.quote/cite` | primary (32B) |
| `tasks/gospel-preview.md` | `liturgical.gospel_preview`, `liturgical.reflect_q` | primary |
| `tasks/saint-bio.md` | `feature.*` (from `saint_candidates`) | primary |
| `tasks/formed-pick.md` | `formed_pick.*` | primary |
| `tasks/announcement-rewrite.md` | polish of `announcements[].body` | primary |
| `tasks/subject-lines.md` | `email.subject_options` | primary |
| `tasks/one-thing.md` | `one_thing.copy`, `email.cta` | primary |
| `tasks/announcement-intake.md` | backlog entry JSON (via `backlog.js add`) | utility (8B) |
| `tasks/feedback-interpretation.md` | structured `issue.json` edits + changelog | utility (8B) |
