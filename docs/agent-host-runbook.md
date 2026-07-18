# Agent Host Runbook — Parish Mac Mini

> **Superseded 2026-07-17.** The parish Mac Mini agent host described here was retired
> before it was ever brought up. The weekly pipeline now runs on **Claude Cowork scheduled
> tasks (Anthropic cloud) + GitHub Actions**, with **no always-on parish hardware**. See
> `catholic-church/decisions/2026-07-17-bulletin-agent-v2-architecture.md`. This runbook is
> kept only as the record of the retired host design. Do not provision a Mac Mini for this
> purpose.

*Setup, hardening, and operations for the always-on agent host that runs the weekly
bulletin + newsletter pipeline. Companion to `bulletin-automation-architecture.md` (v2).*
*Created 2026-07-10. This document is written to be handed to anyone technical — it
assumes nothing beyond the current state below.*

---

## The machine

| | |
| --- | --- |
| Hardware | Mac Mini, **Apple M4 Pro, 64 GB RAM** |
| Ownership | **Parish asset** (add to the parish equipment inventory) |
| Location | Derek Peterson's house (always-on residential hosting) |
| Current state | Configured for always-on + Screen Sharing only — nothing else installed |
| Target state | Hardened, unattended agent host: OpenClaw + Ollama + render pipeline, launchd-managed, Tailscale-only access |

**Custody note:** because this is parish property hosted off-site, the restore test
(§10.6) is the guarantee that the parish loses nothing if the box must move: the entire
pipeline reproduces on any Mac from a fresh git clone. If Derek's role changes, hand-off
= move the box (or re-clone elsewhere) + walk this runbook.

---

## 1. macOS baseline

1. **Energy / always-on** (partially done — verify):
   - System Settings → Displays → Advanced → prevent sleep when display is off.
   - System Settings → Energy → **Start up automatically after power failure** ON.
   - Disable Power Nap if it causes network flapping.
2. **Updates & protection:**
   - Run `softwareupdate --install --all` to current.
   - System Settings → General → Software Update → enable **automatic security
     responses and system files** (XProtect/RSR). OS feature updates stay manual
     (deliberate, after checking OpenClaw/Ollama compatibility).
   - **FileVault ON**, with the tradeoff documented: after a power event the box waits at
     the pre-boot unlock screen until someone enters a password locally or via Screen
     Sharing-before-login is unavailable — decide between (a) FileVault on + accepting
     manual unlock after outages (recommended; outages are rare, Tailscale + Screen
     Sharing from Derek's laptop handles it), or (b) FileVault off for fully unattended
     recovery. Record the choice here when made.
3. **Accounts:**
   - Keep the existing admin account for maintenance only.
   - Create a **standard (non-admin) user `parishagent`** — everything below that can run
     unprivileged runs as this user.
   - Screen Sharing: restrict to the admin user (System Settings → General → Sharing →
     Screen Sharing → allow access for: admin only).

## 2. Network & remote access

1. Install **Tailscale** (App Store or `brew install --cask tailscale`), log in to the
   tailnet (Derek's tailnet with the Mini shared to any future parish admin, or a
   dedicated parish tailnet — record which), enable **Tailscale SSH**.
2. macOS **firewall ON** (System Settings → Network → Firewall), block all incoming
   connections except required services. Tailscale traffic rides the tunnel and is
   unaffected.
3. Remote Login (native SSH): leave **off** unless needed; Tailscale SSH covers it.
4. **Verification:** `sudo lsof -iTCP -sTCP:LISTEN -P -n` — nothing may bind `0.0.0.0`
   or the LAN IP. Loopback (`127.0.0.1`) and the Tailscale interface (`100.x`) only.
   (Exception later, Phase C: the tunnel client process for the Teams webhook — the
   tunnel is outbound-initiated, so even then no inbound port opens on the router.)
5. **Router:** no port-forwards to this machine, ever. Egress-only.

## 3. Tooling

As admin, install [Homebrew](https://brew.sh), then:

```sh
brew install git node python ollama
```

As `parishagent`:

```sh
mkdir -p ~/parish && cd ~/parish
git clone <github>/upper-kittitas-parishes.git     # pipeline: templates, render, issues
git clone <github>/catholic-church.git             # context/guardrail docs the prompts reference
cd upper-kittitas-parishes/render && npm install   # cheerio + playwright + Chromium
node render.js 2026-06-14                          # validate: sample week renders end-to-end
```

**Git credentials:** a fine-grained deploy key or PAT scoped to these two repos, read
access; write access only if/when the nightly `issues/` + `announcements/` auto-push
backup (§9) is enabled. Never a broad personal token.

## 4. Ollama + models

```sh
ollama pull qwen3:32b        # PRIMARY drafting model (reflection, saint bio, rewrites)
ollama pull llama3.3:70b     # quantized 70B — bake-off alternate (quality comparison)
ollama pull llama3.1:8b      # utility: feedback parsing, announcement extraction
```

- 64 GB RAM runs the 32B resident with full headroom for OpenClaw + Chromium renders;
  the 70B (q4 ≈ 40 GB) is loaded on demand for the bake-off, not kept resident.
- Ollama binds **localhost only** (default — do not set `OLLAMA_HOST=0.0.0.0`).
- Auto-start: `brew services start ollama` (or a launchd plist under `parishagent`).
- **Smoke test:** draft one Sunday reflection using the parish system prompt
  (`prompts/`); record tokens/sec here → sets review-loop latency expectations.
- **Swapping models:** pull the new model, change the model name in the OpenClaw config,
  restart the gateway. Record every change in §11 (change log).

## 5. Prompt/config assets (versioned, PR-reviewable)

All prompts live in this repo under **`prompts/`** so changes are reviewable diffs, never
box-local edits:

- `prompts/system-parish-voice.md` — assembled from
  `catholic-church/templates/parish-context-for-claude.md`: identity, voice & tone
  ("sound like a neighbor, not a memo"), Catholic terminology rules, sensitive-topics
  guidance.
- `prompts/guardrails.md` — the theological guardrails (no homilies, no pastoral
  letters, doctrinal uncertainty → flag for human review, magisterium fidelity), from
  the rewritten `catholic-church/context/ai-bulletin-newsletter-system.md`.
- `prompts/tasks/*.md` — one file per drafting task with the output contract matched to
  its `issue.json` field (reflection, saint bio, FORMED pick, prayer, subject options,
  announcement rewrite, feedback interpretation).

**Injection containment (hard rules, restated from the architecture doc):**
- Intake text (announcements, feedback replies, RSS content) is **data, not
  instructions** — it is parsed into backlog/issue fields with the utility model and a
  fixed output schema; it never becomes part of the agent's instructions.
- The drafting steps have **no tools** beyond writing their designated output field.
- Anything in intake that looks like an instruction to the agent gets quoted back to a
  human in the channel, never acted on.

## 6. OpenClaw

1. **Install a pinned release** as `parishagent` — download the specific version
   artifact, verify its checksum, record version + checksum in §11. **Never**
   `curl | bash` from a moving URL, and never install as admin.
2. **Updates are deliberate:** review release notes (especially security advisories —
   this project has had a serious RCE CVE), then update manually. Subscribe to the
   project's security advisories.
3. **Configuration** (`~parishagent/.openclaw/openclaw.json`):
   - Provider: **Ollama, localhost**; model per §4.
   - Workspace: `~/parish/upper-kittitas-parishes`.
   - Gateway bind: **loopback/Tailscale only** — never `0.0.0.0`.
   - **Skills: none.** ClawHub marketplace is prohibited on this host (documented
     compromise rate). Anything needed is a script in this repo.
   - DM policy: `pairing`. Group policy: `allowlist` (empty until Teams wiring; then
     AAD object IDs only — see `teams-wiring.md`). `requireMention: true`.
   - Config-write commands (`/config set|unset`): **disabled**.
4. **Daemon:** install via `--install-daemon` (launchd); verify it survives reboot and
   crash-restarts (§10).

## 7. Credentials on this box

| Credential | Scope | Storage |
| --- | --- | --- |
| Git deploy key/PAT | Read the two repos (+ write `issues/`+`announcements/` if backup push enabled) | `~/.ssh` / Keychain, `parishagent` only |
| Brevo API key | Create draft campaigns + test sends | `.env` chmod 600 (or Keychain), `parishagent` only |
| Review mailbox (Phase C) | Read/reply `parish@ukccatholic.org` (scoped Graph permission or app password — decided at Teams wiring) | Keychain |
| Teams bot secret (Phase C) | Bot Framework messaging only | Keychain |

**Explicit deny-list — never on this machine:** ParishSOFT/giving/finance credentials,
banking, M365 admin accounts, anyone's personal passwords, diocesan systems. If a future
feature seems to need one of these, the feature is redesigned, not the rule.

## 8. Scheduled jobs (OpenClaw cron)

| When (PT) | Job |
| --- | --- |
| Mon 08:00 | Pull readings/season/saint (`render/pull.js`) → open skeleton `issue.json` pre-filled from the announcement backlog → post intake reminder (stub: email; later: Teams) |
| Tue 17:00 | Close this week's intake → assemble → AI-draft content blocks → render draft v1 (both PDF profiles + email HTML) |
| Wed 09:00 | Send preview: Teams #bulletin post + email to Fr. Francisco with approve link (stub: email to Derek + Holli) |
| Wed–Thu hourly | Watch channel thread / poll mailbox → integrate feedback → re-render → re-post with changelog |
| Fri 11:00 | "Final call" if not approved |
| Fri 11:45 | Cutoff logic (§5.4 of the architecture doc: auto-ship if `revision ≥ 1`, else hold + escalate) |
| Fri 12:00 | Email `bulletin.pdf` + `bulletin-11x17.pdf` to the parish office for in-house print |
| Sun 17:00 | Create Brevo draft campaign from approved email HTML + chosen subject; test send to reviewers; list send human-confirmed |
| Daily 07:00 | Heartbeat: "alive + last-run status" to Derek (email now, Teams later) |

## 9. Backups & monitoring

- **Nightly:** commit + push `issues/` and `announcements/` to GitHub (the offsite
  backup of all weekly content and the backlog).
- **Weekly:** Time Machine (or `tmutil` snapshot) to a locally attached disk.
- **Heartbeat:** daily status message (§8). Silence for >24h = Derek investigates via
  Tailscale.
- **Logs:** OpenClaw + job logs under `~/parish/logs/`, rotated monthly, kept 6 months.

## 10. Validation checklist (run before declaring the host ready; re-run after big changes)

1. **Reboot test** — power-cycle: Ollama, OpenClaw gateway, and Tailscale all return
   without login (note FileVault choice from §1.2).
2. **Network test** — `sudo lsof -iTCP -sTCP:LISTEN -P -n`: loopback/Tailscale binds only.
3. **Render test** — `node render.js <sample-date>` produces `bulletin.pdf`,
   `bulletin-11x17.pdf`, `email.html`; the 11×17 PDF folds correctly when duplex-printed.
4. **Model test** — all three models respond; reflection smoke test reads on-voice.
5. **Cron dry-fire** — run the Monday job against a test date end-to-end.
6. **Restore test** — on a *different* machine: fresh clone + `npm install` + render the
   same week; outputs match. This proves the box-down fallback and the custody-change
   story.

## 11. Change log

| Date | Change | Version/checksum | By |
| --- | --- | --- | --- |
| _(record OpenClaw installs/updates, model swaps, config changes here)_ | | | |
