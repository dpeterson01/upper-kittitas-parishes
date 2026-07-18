# Task: Gospel preview + pre-Mass question

**Inputs:** the Sunday's Gospel reference and text (or reading refs if text unavailable).

**Output contract (JSON):**
```json
{
  "liturgical": {
    "gospel_preview": "<2-3 sentences>",
    "reflect_q": "<one pre-Mass question>"
  }
}
```

**Rules:**
- The preview is a *teaser* that makes someone want to listen closely at Mass — point
  at a moment or tension in the passage without resolving it.
- The question is asked *before* Mass ("Before Mass: …") and should fit on one line.
- No spoiler-style summary; no academic language.
