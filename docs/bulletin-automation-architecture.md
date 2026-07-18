# Bulletin & Newsletter Automation — Architecture (v2)

> **Superseded 2026-07-17 — the orchestration, host, and Teams-primary sections below are historical.**
> This document describes the **2026-07-10** design: an OpenClaw gateway plus local Ollama
> models on a parish-owned Mac Mini, with Microsoft Teams as the primary review surface.
> That orchestration was **retired on 2026-07-17** in favor of **Claude Cowork scheduled
> tasks (cloud, unattended) + a GitHub Actions render plane + email review**. The current
> decision of record is
> `catholic-church/decisions/2026-07-17-bulletin-agent-v2-architecture.md`.
>
> **Still current:** the coded design system (`design-system/ui_kits/`), the `render/`
> pipeline, the `prompts/` library, and the `announcements/` intake model.
> **Retired:** the Mac Mini host, OpenClaw, local Ollama models, launchd/cron scheduling,
> and Teams as the launch surface (Teams is deferred until the parish M365 tenant lands).
> The companion `agent-host-runbook.md` and `teams-wiring.md` are superseded for the same
> reason.

*Decided architecture for the weekly parish bulletin + email newsletter pipeline.*
*Status: v1 design approved in principle 2026-06-29; **v2 decided 2026-07-10** — fills in
the orchestration and review planes (OpenClaw + Ollama on the parish Mac Mini, Microsoft
Teams as the collaboration surface). Render slice built; agent host not yet brought up.*

This is the **decided** plan, not a menu of options. It supersedes the manual
Canva/ChatGPT workflow described in
`catholic-church/context/ai-bulletin-newsletter-system.md` — that doc remains useful for
content sources, theological guardrails, and the editorial calendar, but the **layout
engine is now the coded design system in this repo, not Canva**, and **eCatholic is
dropped**.

**v2 changes (2026-07-10, decision record:
`catholic-church/decisions/2026-07-10-bulletin-agent-architecture.md`):**
- **Orchestration:** an **OpenClaw** gateway running always-on on the **parish-owned
  Mac Mini (M4 Pro, 64 GB)** hosted at Derek's house — replaces the vague "scheduled
  Claude agent on Derek's account."
- **AI engine:** **local models via Ollama** on the same box (32B-class primary, quantized
  70B alternate, small utility model). No per-token cloud billing; an optional cloud
  fallback is documented but disabled by default.
- **Review transport:** **Microsoft Teams channel** for staff (threaded feedback,
  Adaptive Card approve) **plus an email fallback for Fr. Francisco** (one-click approve
  link; first approval wins). The v1 email loop remains the stub until Teams is deployed.
- **Announcement intake:** **Teams-native** — staff post announcements (including
  future-dated) in-channel; the agent maintains a rolling backlog. Replaces the
  Microsoft Form → SharePoint design (§3).
- **Delivery:** email endpoint resolved to **Brevo** (parish decision 2026-07-03).
- **Print:** resolved to **in-house** at the church (quality printer + mechanical
  folder); the renderer gains an **11×17 imposed booklet** profile.
- **Reviewers:** resolved to **Fr. Francisco (approver) + Holli (reviewer)**.
- Setup/hardening for the host: `docs/agent-host-runbook.md`. Teams wiring (gated on the
  M365 tenant): `docs/teams-wiring.md`.

---

## 1. Goals & operating constraints

| Constraint | Decision |
| --- | --- |
| **Outputs** | (1) print-ready **PDF** emailed for printing/handout, (2) **email-ready HTML** for the parishioner blast. Nothing else. |
| **Layout engine** | The coded design system (`design-system/`) — tokens, fonts, logos, season theming. **Replaces Canva.** |
| **Dropped** | eCatholic. No website push from this pipeline. |
| **Operator** | Non-technical parish staff (Holli, Lacie, Braden) + Fr. Higuera. **Derek is not operationally involved after setup.** |
| **Billing** | **$0/month AI** — local models (Ollama) on parish-owned hardware. The queued Claude-for-Nonprofits seats (WS 5a.4) are for interactive staff use, not this pipeline. |
| **Review loop** | Preview posted to the **Teams #bulletin channel** (staff) + **emailed to Fr. Francisco** with a one-click approve; reviewers **reply with feedback**; system integrates and re-posts an updated preview; loops until an **approval signal**. Email-only loop is the stub until Teams is deployed. |
| **SLA — print** | On approval, PDF emailed to the parish office **no later than Friday mid-day**; printed **in-house** (church printer + mechanical folder; 11×17 folded or 8.5×11). |
| **SLA — email** | Newsletter HTML delivered to the (TBD) email-send endpoint **by EOD Sunday**. |

**Design principle:** one source of truth per week (`issue.json`), a deterministic
render, and a human approval gate. Staff never touch code, git, or the templates.

---

## 2. System overview — three planes

```
CONTENT PLANE                    RENDERING PLANE              ORCHESTRATION + REVIEW PLANE
─────────────                    ───────────────              ────────────────────────────
auto-pulled  ┐                                                OpenClaw gateway + Ollama
 readings    │                                                on parish Mac Mini (launchd,
 season      │   ┌──────────────┐    ┌────────────────┐       weekly cron)
 saint       ├──▶│ issue.json   │──▶ │ render step     │──▶  preview → Teams #bulletin
Teams intake │   │ (week record)│    │ templates +     │      + email to Fr. (approve link)
 → rolling   │   └──────────────┘    │ design tokens   │        ▲           │ feedback
 backlog     │                        │ → bulletin.pdf  │        │           ▼ (thread/reply)
 (run dates) │                        │   (8.5×11 +     │    re-render ◀── integrate edits
AI-drafted   ┘                        │    11×17 imposed)│                   │
 reflection                           │ → email .html   │              approval signal
 saint bio                            └────────────────┘        (card button / email click)
 FORMED pick                                                  ┌─────────────┴─────────────┐
 prayer, subj                                                 ▼                           ▼
                                                      PDF → parish office        HTML → Brevo draft
                                                      in-house print             campaign + test send
                                                      (≤ Friday mid-day)         (≤ EOD Sunday)
```

---

## 3. Content plane — the weekly data contract

Everything about one week lives in a single file: `issues/YYYY-MM-DD.json` (the Sunday
date). This is the contract between content and rendering. Proposed schema:

```jsonc
{
  "issue_date": "2026-07-05",            // the Sunday
  "liturgical": {
    "season": "ordinary",                // drives .season-* theming automatically
    "title": "14th Sunday in Ordinary Time",
    "readings": {                        // auto-pulled from USCCB by date
      "first": "Is 66:10-14c",
      "psalm": "Ps 66",
      "second": "Gal 6:14-18",
      "gospel": "Lk 10:1-12, 17-20"
    }
  },
  "reflection": {                        // "From Fr. Francisco" — AI-drafted, priest-approved
    "body": "...",
    "question": "..."
  },
  "saint": { "name": "...", "feast": "...", "bio": "..." },   // AI-drafted
  "formed_pick": { "title": "...", "blurb": "..." },          // AI-drafted
  "prayer_of_week": "...",
  "announcements": {
    "ic":     [ { "title": "...", "body": "..." } ],          // Immaculate Conception
    "sjb":    [ { "title": "...", "body": "..." } ],          // St. John the Baptist
    "shared": [ { "title": "...", "body": "..." } ]
  },
  "events": [ { "date": "...", "title": "...", "where": "..." } ],
  "stewardship": { "ic_last_week": null, "sjb_last_week": null, "budget_need": null },
  "newsletter": {
    "subject_options": ["...", "..."],   // AI-drafted, reviewer picks one
    "subject_chosen": null,
    "feature_ref": "reflection",         // which block leads the email
    "cta": { "label": "...", "url": "..." }
  },
  "status": "draft",                     // draft → in_review → approved → printed → sent
  "review": { "preview_url": null, "revision": 0, "feedback_log": [] }
}
```

**Static data** (Mass times, staff directory, sacraments, contact, logos) is NOT in the
weekly file — it lives in `source/data/parish-facts.md` and is baked into the templates.
The weekly file only carries what changes week to week.

### Input sources

| Field group | Source | Automation |
| --- | --- | --- |
| `liturgical.readings`, `season`, `title` | USCCB (date-deterministic URL) | Fully automated |
| `saint` | Franciscan Media / CNA saint-of-day RSS | Automated pull, AI summarizes |
| `reflection`, `formed_pick`, `prayer_of_week`, `newsletter.subject_options` | AI-drafted from readings + parish voice | Automated draft, human review |
| `announcements`, `events`, `stewardship` | **Teams #bulletin channel** (v2; replaces the Microsoft Form → SharePoint design) — staff post announcements in-channel, including future-dated ones; the agent parses each into a **rolling backlog** (`announcements/backlog.json`: title, body, parish ic/sjb/shared, start/end run dates, submitter, source-thread link, status), confirms capture in-thread with the parsed run dates, answers "what's running the next two weeks?" on demand, and accepts edits/withdrawals in the same thread. Weekly assembly pulls entries active for that Sunday. **Until Teams exists:** same parser fed by email to a designated address. | Staff post; agent parses + confirms; AI cleans copy |

> **Injection containment (hard rule):** everything arriving via intake — announcement
> text, feedback replies, RSS content — is **untrusted data**. It flows into
> `issue.json`/backlog *fields* and is rendered or summarized; it is never treated as
> instructions to the agent, and intake parsing runs with no tools beyond writing the
> backlog entry.

---

## 4. Rendering plane — the design system as engine

### 4.0 Prerequisite: recover the templates — DONE (2026-06-29)

The manifest (`design-system/_ds_manifest.json`) referenced
`ui_kits/parish_bulletin/bulletin.html` and `ui_kits/parish_newsletter/newsletter.html`,
but only the `.css` files had been exported into the repo — the markup was trapped in
Claude Design. **Both templates have now been reconstructed in the repo** as real,
placeholder-driven HTML, validated against the existing CSS (every class backed; logos
resolve), each with a screen-only `.dev-panel` for reviewing variants:

- `ui_kits/parish_bulletin/bulletin.html` — weekly 4-page bulletin, all variant systems
  wired (hero, feature ×5, kids-corner ×6, house-card ×5, encounter-pair layouts), season
  switchable, sample = Issue 1, 11th Sunday OT, June 14 2026.
- `ui_kits/parish_newsletter/newsletter.html` — quarterly 4-page print newsletter, per-page
  parish accents (SJB green / IC blue), financials, spotlights, sample = Summer 2026.

### 4.0a IMPORTANT — there are THREE artifacts, only TWO templates exist

Recovering the templates surfaced a scope clarification. The coded "newsletter" is a
**quarterly _print_ piece** (imposed to an 11×17 booklet), **not** the weekly email-HTML
the delivery SLA (§1, EOD-Sunday) refers to. So:

| # | Artifact | Cadence | Format | Template status |
| --- | --- | --- | --- | --- |
| 1 | Weekly bulletin | Weekly | Print PDF (8.5×11 ×4) | ✅ recovered |
| 2 | Quarterly newsletter | Quarterly | Print PDF (→11×17 booklet) | ✅ recovered |
| 3 | **Weekly email newsletter** | Weekly | **Email-safe HTML (single-column, mobile)** | ✅ created 2026-06-29 |

All three artifacts now have templates. Artifact #3 lives at
`ui_kits/parish_email/email.html` — a single-column, ~600px, table-based, fully
inline-CSS email built on the same brand color tokens (web-safe font fallbacks since mail
clients don't honor `@font-face`; absolute image URLs required). Content mirrors the
strategy doc: header band → pastor reflection → Three Things to Know → FORMED pick →
one CTA button → Mass times → footer with `{{unsubscribe_url}}` / `{{preferences_url}}`
merge fields for whichever send platform is chosen (§7, item 1).

### 4.1 Render step

A small, dependency-light build script (~100–150 lines, Node or Python):

1. Read `issues/YYYY-MM-DD.json` + `parish-facts.md`.
2. Set the liturgical season class (`.season-advent`, etc.) from `liturgical.season` so
   accent colors theme automatically — the CSS already supports this.
3. Fill the two placeholder templates → `bulletin.html` and `newsletter.html`.
4. **Bulletin → PDF** via headless Chromium (Playwright) at 8.5×11, print stylesheet.
4b. **Bulletin → imposed 11×17 booklet PDF** (v2): a second profile that imposes the four
   8.5×11 pages onto one duplex 11×17 sheet in booklet page order (4,1 / 2,3) for the
   church's in-house printer + mechanical folder.
5. **Newsletter → email-safe HTML** (inline the CSS, single-column, mobile-first; the
   email kit is already designed single-column).

Outputs land in `issues/YYYY-MM-DD/`: `bulletin.pdf`, `bulletin-11x17.pdf`,
`newsletter.html` (email), plus the rendered `bulletin.html` for the preview.

### 4.2 Why this replaces Canva

Deterministic, on-brand every time, zero manual layout, and it actually uses the design
system you built. The only human creative input is content + the feedback loop.

---

## 5. Orchestration + review plane (runs without Derek)

The engine is an **OpenClaw gateway with local Ollama models** on the parish-owned
Mac Mini (M4 Pro, 64 GB), running as a launchd daemon with OpenClaw's built-in cron.
It is operationally autonomous — Derek maintains the host but does not run the weekly
cycle, and there is no per-token AI bill. Host setup, hardening, model selection, and the
credential-scoping rules live in `docs/agent-host-runbook.md`.

### 5.1 Weekly timeline (proposed; all times configurable)

| When | Step | Surface |
| --- | --- | --- |
| **Mon 8:00 AM** | Pull readings/season/saint → open the week's `issue.json` (pre-filled from the announcement backlog). Post announcement reminder. | Teams #bulletin (stub: email) |
| **Tue 5:00 PM** | Announcement intake closes for this week. Agent assembles `issue.json`, AI-drafts content, renders **draft v1**. | — |
| **Wed 9:00 AM** | **Preview** (rendered bulletin PDF + newsletter) posted to Teams #bulletin **and** emailed to Fr. Higuera with a one-click approve link. | Teams + email |
| **Wed–Thu** | Agent watches the channel thread and polls the review mailbox (hourly). Each piece of feedback → integrate into `issue.json` → re-render → post **updated preview** with a one-line changelog. | Teams thread + email reply loop |
| **Fri 11:00 AM** | If approved → finalize. If not yet approved → "final call" to reviewers. | Teams + email |
| **Fri 11:45 AM** | Escalation cutoff (see §5.4) to guarantee the mid-day print SLA. | — |
| **Fri 12:00 PM** | **PDF (8.5×11 + 11×17 imposed) emailed to the parish office** for in-house print (church printer + mechanical folder). | Email + PDF attachments |
| **Sun ~5:00 PM (EOD)** | **Brevo draft campaign created from the approved email HTML + chosen subject; test send to reviewers.** List send is human-confirmed (or auto after approval once trust is earned). | Brevo API |

### 5.2 The feedback loop ("they respond, it integrates, re-posts")

- **Staff surface (Teams):** the preview lands as a post in **#bulletin** with the PDF
  attached; Holli (and any other staff) reply **in the thread** with plain-English
  feedback ("move the festival to the top," "shorten the reflection," "8 a.m. not
  9 a.m. at IC"). The agent maps each item to a structured edit of `issue.json`,
  re-renders, and replies in-thread with a fresh preview + a one-line changelog.
- **Father's surface (email fallback):** the same preview goes to Fr. Francisco by email
  from `parish@ukccatholic.org`; he can simply reply. Whichever surface produces
  feedback or approval first is honored — same loop, two transports.
- Each pass increments `review.revision` and appends to `feedback_log`.
- **Until Teams is deployed**, the email loop alone is the transport (this was the v1
  design and remains fully specified above).

### 5.3 The approval signal

Keep it dead simple and unambiguous:
- **Teams:** tap **"✅ Approve"** on the Adaptive Card attached to the preview post, or
  reply `APPROVED` in the thread.
- **Email (Father's path):** an **"✅ Approve this issue" mailto link** in every preview
  email that pre-fills an approval reply, or reply with **`APPROVED`** on its own line.
- First approval from an authorized approver (Fr. Francisco; Holli as delegate if Father
  designates) wins.

On approval: `status → approved`, the loop stops, and the Friday-noon finalize fires.

### 5.4 The "not approved by Friday" rule — DECIDED: auto-ship if engaged

To guarantee the mid-day-Friday print SLA without shipping something nobody looked at:

- At the **Fri 11:45 AM cutoff**, if no `APPROVED` has arrived:
  - **If `review.revision ≥ 1`** (someone engaged with the preview at least once) →
    **auto-finalize the latest preview** and proceed to the Friday-noon PDF send.
  - **If `review.revision == 0`** (no one engaged at all) → **hold**, do not print, and
    fire a loud escalation alert to Father + office.
- Either branch sends a loud alert so a human always knows print shipped (or didn't).

---

## 6. Components & tech

| Plane | Component | Implementation |
| --- | --- | --- |
| Schedule/orchestration | Weekly cron agent | **OpenClaw** (pinned version, launchd daemon) on the parish Mac Mini — see `agent-host-runbook.md` |
| AI engine | Drafting + feedback interpretation | **Ollama, local**: 32B-class primary (drafting), quantized 70B alternate (bake-off), ~8B utility (parsing/extraction). Prompts versioned in `prompts/` |
| Data pull | Readings/season/saint | `render/pull.js` hitting USCCB + saint RSS |
| Intake | Announcements | **Teams #bulletin channel → `announcements/backlog.json`** (stub: designated email address, same parser) |
| Render | `issue.json` → PDFs + email HTML | Node build script + Playwright (this repo, `render/`) |
| Preview hosting | Rendered preview | PDF attached to the Teams post / email (no separate host needed) |
| Review transport | Preview + feedback + approval | **Teams #bulletin + email fallback** via `parish@ukccatholic.org` |
| Print delivery | PDFs to parish office | Email attachment; printed **in-house** (11×17 + mechanical folder) |
| Email delivery | Newsletter HTML | **Brevo** — `render/deliver-brevo.js` creates the draft campaign + test send; list send human-confirmed |

---

## 7. Open items

1. ~~**Email-send endpoint**~~ — **RESOLVED (2026-07-03/2026-07-10): Brevo.** The adapter
   interface stands (`send_newsletter(html, subject, issue_date)`); the concrete adapter
   is `render/deliver-brevo.js` (draft campaign + test send; list send human-confirmed).
2. ~~**Reviewer list**~~ — **RESOLVED (2026-07-10): Fr. Francisco (approver) + Holli
   (reviewer).** Father engages weekly (confirmed).
3. ~~**Print recipients**~~ — **RESOLVED (2026-07-10): in-house.** The church has a
   quality printer and a mechanical folder (11×17 folded or 8.5×11); Friday-noon PDFs go
   to the parish office address.
4. **Review mailbox access** — confirm the agent can read replies to `parish@ukccatholic.org`
   (shared mailbox / Graph permission / dedicated alias). Gated on the M365 tenant.
5. ~~**The §5.4 not-approved-by-Friday rule.**~~ — **DECIDED** (auto-ship if engaged; §5.4).
6. **Stewardship numbers** — who enters them weekly, and where (channel post vs. skip).

---

## 8. Ownership & hand-off

v2 removes the billing-migration problem entirely: the hardware is **parish-owned** and
the AI is **local ($0/month)** — there is no Derek-funded subscription to migrate.
What remains is administrative:
- Keep all parish-facing surfaces (Teams channel, review mailbox, Brevo) in the
  **parish tenant/accounts** from day one.
- The Mac Mini is a **parish asset physically hosted at Derek's house** — it belongs on
  the parish equipment inventory, and the runbook's restore test proves the whole
  pipeline reproduces on any machine from a fresh git clone (the box-down / custody-change
  fallback). Hand-off = moving the box (or re-cloning elsewhere) + walking the runbook.

---

## 9. Phased build plan

1. ~~**Recover templates** — reconstruct `bulletin.html` + `newsletter.html` into the repo
   from the existing CSS (§4.0).~~ ✅ **Done 2026-06-29.**
1b. ~~**Design the weekly email template (artifact #3, §4.0a)**~~ ✅ **Done 2026-06-29** —
   `ui_kits/parish_email/email.html`, email-safe single-column kit on the same tokens.
2. ~~**Define `issue.json`** schema + a sample week~~ ✅ **Done 2026-06-29** —
   schema in §3; sample `issues/2026-06-14.json` (11th Sunday OT).
3. **Build the render step** — ✅ **bulletin slice done 2026-06-29.** `render/` (Node +
   cheerio + Playwright) injects `issue.json` into the templates and prints the bulletin
   PDF; verified end-to-end on the sample week (HTML injection checks all pass; PDF needs
   `npm install` in `render/` to pull Chromium). **Remaining:** full email field-mapping
   (currently CTA-only), the 11×17 imposed profile (§4.1 step 4b), and wiring the
   quarterly newsletter into the renderer (later — quarterly cadence).
4. **Wire data pullers** — USCCB readings + saint RSS (`render/pull.js`); announcement
   backlog + intake parser (email-fed stub → Teams later).
5. **Bring up the agent host** — Mac Mini per `agent-host-runbook.md`: hardening,
   Ollama + models, OpenClaw pinned install, cron jobs, validation checklist.
6. **Build the review loop (stub transport)** — preview email to Derek + Holli, mailbox
   polling, feedback→edit→re-render, approval signal. Runs weekly before Teams exists.
7. **Wire delivery** — Friday-noon PDFs to the parish office + `deliver-brevo.js`
   (draft + test send).
8. **Teams wiring** — GATED on the M365 tenant (WS 5b.1) + Teams rollout (5b.2); execute
   `docs/teams-wiring.md`, then move review + intake from stubs to the channel.
9. **Dry run + bake-off** for 1–2 weeks alongside the current process — includes the
   local-model quality bake-off (32B vs 70B vs the current bulletin's bar; go/no-go
   recorded; if local drafting fails the bar, the fallback decision is cloud API for
   *drafting only*) — then cut over.
```
