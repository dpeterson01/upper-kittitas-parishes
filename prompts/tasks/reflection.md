# Task: "From Fr. Francisco" reflection

**Inputs:** the Sunday's readings (refs + season + title from `issue.json`), the
52-week editorial calendar's note for this week if provided.

**Output contract (JSON):**
```json
{
  "reflection": { "body": ["<para 1>", "<para 2>", "<para 3>"], "question": "<one question>" },
  "hero": { "quote": "<one striking line from this Sunday's Gospel>", "cite": "<Book C:V>" }
}
```

**Rules:**
- 200–300 words total across 2–3 paragraphs. First person, warm, pastoral — drafted
  *for Fr. Francisco's review*, in his voice, never published without him.
- Connect the Gospel to daily life in a small mountain community. Concrete over
  abstract; one image or moment, not a survey of themes.
- End toward the question: one reflection question a family could discuss this week.
- This is a reflection, not a homily — no exegesis lecture, no moral scolding.
- The hero quote is a verbatim line from this Sunday's Gospel (check the citation).
