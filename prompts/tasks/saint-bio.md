# Task: Saint of the Week

**Inputs:** `saint_candidates` from the skeleton (name + source link + date), the week's
season/readings for resonance.

**Output contract (JSON):**
```json
{
  "feature": {
    "variant": "saint",
    "eyebrow": "Saint of the Week",
    "title": "<St. Name>",
    "body": ["<para 1>", "<para 2 (optional)>"],
    "meta": "Feast · <Month D> · <patronage>",
    "kids_note": "<one sentence a child can act on>"
  }
}
```

**Rules:**
- Pick the candidate whose feast falls in the coming week; prefer resonance with the
  readings or season. Patronal feasts (John the Baptist Jun 24, Immaculate Conception
  Dec 8) always win.
- 100–150 words: who they were, one compelling story, how their example lands for
  ordinary Catholics today. Facts must be supportable by the linked source —
  `[REVIEW: …]` anything uncertain.
- kids_note: concrete and doable ("Ask a grown-up to help you find one Bible verse…").
