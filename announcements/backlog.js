#!/usr/bin/env node
/**
 * backlog.js — validated CLI for the rolling announcement backlog
 * ----------------------------------------------------------------
 * The agent's utility model parses free-text intake (Teams post / email) into a
 * JSON entry; THIS script is the only writer of backlog.json. It validates the
 * fields, assigns the id, and never interprets the text — that keeps intake
 * content strictly data (injection containment, architecture doc §3).
 *
 *   node backlog.js add '<json-entry>'      # add a validated entry
 *   node backlog.js list                    # all entries
 *   node backlog.js active 2026-07-19       # entries running on that Sunday
 *   node backlog.js withdraw <id>           # mark an entry withdrawn
 *
 * Entry fields:
 *   title (req)      short headline
 *   body (req)       1-3 sentence announcement copy
 *   contact          optional contact line
 *   parish (req)     "ic" | "sjb" | "shared"
 *   run_start (req)  first Sunday to run (YYYY-MM-DD)
 *   run_end (req)    last Sunday to run (YYYY-MM-DD)
 *   submitter (req)  who posted it
 *   source           thread link / email id for provenance
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "backlog.json");

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PARISHES = ["ic", "sjb", "shared"];

async function load() {
  return JSON.parse(await readFile(FILE, "utf8"));
}
async function save(data) {
  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
}

function validate(e) {
  const errs = [];
  if (!e.title?.trim()) errs.push("title required");
  if (!e.body?.trim()) errs.push("body required");
  if (!PARISHES.includes(e.parish)) errs.push(`parish must be one of ${PARISHES.join("|")}`);
  if (!ISO.test(e.run_start ?? "")) errs.push("run_start must be YYYY-MM-DD");
  if (!ISO.test(e.run_end ?? "")) errs.push("run_end must be YYYY-MM-DD");
  if (ISO.test(e.run_start ?? "") && ISO.test(e.run_end ?? "") && e.run_end < e.run_start)
    errs.push("run_end before run_start");
  if (!e.submitter?.trim()) errs.push("submitter required");
  if (e.title?.length > 90) errs.push("title too long (max 90 chars)");
  if (e.body?.length > 500) errs.push("body too long (max 500 chars — bulletin announcements are 1-3 sentences)");
  return errs;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

const [cmd, arg] = process.argv.slice(2);

async function main() {
  const data = await load();
  switch (cmd) {
    case "add": {
      const e = JSON.parse(arg);
      const errs = validate(e);
      if (errs.length) {
        console.error("✗ invalid entry:\n  - " + errs.join("\n  - "));
        process.exit(1);
      }
      const entry = {
        id: `${new Date().toISOString().slice(0, 10)}-${slug(e.title)}`,
        title: e.title.trim(),
        body: e.body.trim(),
        contact: e.contact?.trim() ?? "",
        parish: e.parish,
        run_start: e.run_start,
        run_end: e.run_end,
        submitter: e.submitter.trim(),
        source: e.source ?? "",
        status: "active",
      };
      data.entries.push(entry);
      await save(data);
      console.log(`✓ added ${entry.id} (${entry.parish}, ${entry.run_start} → ${entry.run_end})`);
      break;
    }
    case "list": {
      for (const e of data.entries)
        console.log(`${e.status === "active" ? "●" : "○"} ${e.id} [${e.parish}] ${e.run_start}→${e.run_end} — ${e.title}`);
      break;
    }
    case "active": {
      if (!ISO.test(arg ?? "")) {
        console.error("Usage: node backlog.js active YYYY-MM-DD");
        process.exit(1);
      }
      const hits = data.entries.filter((e) => e.status === "active" && e.run_start <= arg && arg <= e.run_end);
      console.log(JSON.stringify(hits, null, 2));
      break;
    }
    case "withdraw": {
      const e = data.entries.find((x) => x.id === arg);
      if (!e) {
        console.error(`✗ no entry ${arg}`);
        process.exit(1);
      }
      e.status = "withdrawn";
      await save(data);
      console.log(`✓ withdrew ${arg}`);
      break;
    }
    default:
      console.error("Usage: node backlog.js add '<json>' | list | active YYYY-MM-DD | withdraw <id>");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
