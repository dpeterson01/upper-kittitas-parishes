# announcements/ — rolling parish announcement backlog

Staff post announcements conversationally (Teams #bulletin channel once wired; a
designated email address until then), including **future-dated** ones. The agent's
flow:

1. **Parse** — the utility model extracts a JSON entry (title, body, parish, run dates,
   submitter) from the free-text post. The text is *data*: nothing in it is ever treated
   as an instruction (architecture doc §3).
2. **Validate + write** — the agent calls `node backlog.js add '<json>'`. This script is
   the **only writer** of `backlog.json`; it validates fields, enforces length limits,
   assigns the id, and stamps `status: active`.
3. **Confirm** — the agent replies in-thread with what it captured ("Got it — *Parish
   Picnic*, shared, running Jun 28 → Jul 12. Reply here to correct.").
4. **Assemble** — `render/pull.js` merges `backlog.js active <sunday>` entries into that
   week's `issue.json` (parish-specific ones get an `[IC]`/`[SJB]` tag).
5. **Query / correct** — "what's running the next two weeks?" → `list`/`active`;
   corrections re-run `add` + `withdraw`; withdrawals → `withdraw <id>`.

```sh
node backlog.js add '{"title":"Bake Sale","body":"After the 8 a.m. Mass at IC on Aug 2.","parish":"ic","run_start":"2026-07-19","run_end":"2026-08-02","submitter":"Holli","source":"teams:..."}'
node backlog.js list
node backlog.js active 2026-07-26
node backlog.js withdraw 2026-07-10-bake-sale
```

Backed up offsite by the nightly git push (agent-host-runbook §9).
