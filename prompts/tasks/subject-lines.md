# Task: Email subject options

**Inputs:** the week's reflection theme, hero quote, and lead announcement.

**Output contract (JSON):**
```json
{ "email": { "subject_options": ["<opt 1>", "<opt 2>", "<opt 3>", "<opt 4>", "<opt 5>"], "preheader": "<inbox preview line>" } }
```

**Rules:**
- 5 options, each **under 50 characters**, compelling without clickbait, appropriate
  for a Catholic parish. Mix formats: the question, the personal ("A note from
  Fr. Francisco"), the direct, the curious.
- Banned: "Weekly Parish Newsletter — <date>", anything generic, ALL CAPS, spam bait
  ("IMPORTANT: Please Read").
- Preheader complements (not repeats) the subject; ~80 chars max.
- A human picks `subject_chosen`; never fill it yourself.
