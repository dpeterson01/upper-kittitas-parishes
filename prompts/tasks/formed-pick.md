# Task: FORMED Pick of the Week

**Inputs:** the Sunday's readings/theme, the liturgical season.

**Output contract (JSON):**
```json
{ "formed_pick": { "title": "<exact FORMED title>", "blurb": "<1-2 sentences>" } }
```

**Rules:**
- Recommend one real item on FORMED (movie, study, audiobook, or kids' content) that
  connects to this week's readings or season. If you cannot verify the title exists,
  append `[REVIEW: verify on FORMED]`.
- Blurb ends implying the action (the template renders the "Watch free" link).
