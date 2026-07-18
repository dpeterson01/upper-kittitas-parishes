# Task: Announcement polish

**Inputs:** the week's `announcements[]` merged from the backlog (already validated
entries — you are polishing copy, not changing facts).

**Output contract (JSON):** the same array, each entry's `body` polished:
```json
{ "announcements": [ { "title": "…", "body": "…", "contact": "…" } ] }
```

**Rules:**
- 2–3 sentences max each: what, when, where, who to contact. Warm and inviting, not
  bureaucratic (see the instead-of table in the voice prompt).
- **Never alter dates, times, locations, names, or contact info.** If a fact is missing
  or ambiguous, keep the original wording and add `[TODO: confirm …]`.
- Keep `[IC]`/`[SJB]` tags on titles as given. Maximum 3 announcements lead the email
  ("Three Things to Know"); order by importance to a first-time reader.
