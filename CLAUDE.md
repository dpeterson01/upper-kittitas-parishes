# Website repo — working notes for Claude Code

Holds three areas: `site/` (deployable static site), `design-system/` (reusable brand
foundation), and `source/` (editable Claude Design source). Account and git-identity
conventions are inherited from `~/projects/personal/CLAUDE.md` — this is the personal
account **`dpeterson01`**.

## Source of truth: Claude Design, not this repo
The visual design and page content are authored in **Claude Design** and exported as a
project archive (`.zip`). Do not hand-edit the design in `site/` — it gets overwritten on
the next export refresh. Fixes to the *look* go through Claude Design.

## Updating from a new Claude Design export ("do the usual")
When the user says a new export is in `~/Downloads`:
1. Find the newest export zip (e.g. `New Church Website Project.zip`) and extract to a
   scratch/staging dir.
2. Refresh `site/` wholesale from the export's `site/` (`rsync -a --delete`).
3. Refresh `source/` from the export root: the `.dc.html` files, `support.js`, `data/`,
   `uploads/`. Drop dev artifacts (`screenshots/`, `.thumbnail`).
4. Re-run font optimization: `python3 scripts/optimize-site-fonts.py` (needs `fonttools`
   + `brotli`). Converts the export's ~11 MB of TTF to woff2 (~3 MB) and rewrites
   `@font-face`. Don't skip it — it's why the site is small.
5. Do **not** overwrite `design-system/README.md`. It's maintained here, not in Claude
   Design (the export's copy has stale references to files that don't exist).
6. Commit and push to `main`.

## Deploy
GitHub Pages serves `site/` via `.github/workflows/deploy-pages.yml` on every push to
`main`. Live: https://dpeterson01.github.io/ukc-website/

## Verify a deploy
`gh run list --limit 1` for status, then curl the live URL and a `.woff2` font (expect
200) plus an old `.ttf` (expect 404) to confirm the optimized fonts shipped.
