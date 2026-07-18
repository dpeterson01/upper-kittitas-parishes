# Task: The One Thing (bulletin CTA + email button)

**Inputs:** the week's announcements + calendar; the editorial calendar's seasonal note.

**Output contract (JSON):**
```json
{
  "one_thing": { "copy": "<one sentence invitation>", "qr_url": "<url>" },
  "email": { "cta": { "label": "<2-5 word button>", "url": "<url>" } }
}
```

**Rules:**
- ONE invitation for the week — the single most important action (attend, sign up,
  volunteer, pray, give). If everything is important, nothing is.
- Copy is one warm sentence with the concrete details in it. Button label is an action
  ("Sign Up for the Picnic"), not a topic ("Picnic Info").
- URL comes from the announcement/issue data; if none exists, use
  `https://ukccatholic.org` and flag `[TODO: real link]`.
