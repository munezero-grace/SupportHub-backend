/**
 * HIGH-Priority Gold Dataset Candidate Generator
 *
 * Model V1's weakest class is HIGH (test F1 = 0.471, n=8) — it gets
 * confused with both MEDIUM and CRITICAL (see prisma/model/report.txt).
 * This script asks Groq for additional HIGH-tier tickets, including
 * boundary cases against MEDIUM and CRITICAL, so a human can review and
 * label them for the next training round.
 *
 * The suggested_label column is Groq's suggestion — you MUST verify every
 * row. Only the human_label column you fill in manually counts as ground
 * truth.
 *
 * Usage:  npm run gold:generate:high
 * Output: prisma/gold_candidates_high.csv
 */

import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const OUTPUT = path.resolve(__dirname, "gold_candidates_high.csv");
const GOLD_CANDIDATES = path.resolve(__dirname, "gold_candidates.csv");

type Candidate = {
  title: string;
  description: string;
  suggested_label: "HIGH";
  source: string;
};

const HIGH_DEF = [
  "A core workflow is broken for many users; the system is up but badly degraded.",
  "Examples: login broken for a user group, financial reports showing wrong totals, backups failing silently, SLA breach, notifications not sending.",
  "Tone: clearly frustrated or urgent — 'escalating this', 'unacceptable', 'we are breaching SLA'.",
].join(" ");

const SYSTEMS = [
  "authentication and login",
  "password reset",
  "two-factor authentication",
  "payment checkout",
  "invoice generation",
  "subscription billing",
  "REST API",
  "webhook delivery",
  "API rate limiting",
  "database backups",
  "CSV / Excel export",
  "email notifications",
  "ticket search",
  "analytics dashboard",
  "user roles and permissions",
  "file uploads",
  "audit logging",
  "mobile app",
  "third-party integrations",
  "session management",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeCsv(val: string): string {
  return `"${String(val).replace(/"/g, '""')}"`;
}

async function generateHighBatch(count: number, systems: string[]): Promise<Candidate[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content: [
          "You generate realistic software support tickets for a SaaS helpdesk platform.",
          "",
          "URGENCY TIER: HIGH",
          `DEFINITION: ${HIGH_DEF}`,
          "",
          "RULES:",
          `- Generate exactly ${count} tickets.`,
          `- Cover a variety of these systems: ${systems.join(", ")}.`,
          "- Title: 5-12 words, specific, no generic phrases.",
          "- Description: 2-4 sentences written as a real customer message.",
          "- Vary tone within the tier's allowed range — not every ticket should feel the same.",
          "- Do NOT use: 'I hope this finds you well', 'Dear support team', or similar openers.",
          "- Do NOT repeat the same problem twice.",
          "- Keep language realistic — not exaggerated or movie-villain dramatic.",
          "",
          'Reply with STRICT JSON only: {"tickets": [{"title": "...", "description": "..."}, ...]}',
        ].join("\n"),
      },
      {
        role: "user",
        content: `Generate ${count} HIGH urgency support tickets.`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const items: Array<{ title: string; description: string }> = parsed.tickets ?? [];

  return items
    .filter((t) => t.title?.trim() && t.description?.trim())
    .map((t) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      suggested_label: "HIGH" as const,
      source: "synthetic-high",
    }));
}

/**
 * Boundary cases that the model currently confuses:
 * - HIGH mistaken for CRITICAL (degraded but not fully down)
 * - HIGH mistaken for MEDIUM (affects many users, not just one)
 */
async function generateBoundaryCases(): Promise<Candidate[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: [
          "You generate HIGH urgency support tickets that sit right on the boundary",
          "with neighboring severity tiers, to help a classifier learn the difference.",
          "",
          "Generate 10 tickets for each of these 2 types (20 total), all labeled HIGH:",
          "",
          "TYPE A — looks almost CRITICAL but isn't: a core workflow is badly broken",
          "for many users (e.g. checkout fails for one payment provider, exports time",
          "out for large accounts), but the overall system is still up and a partial",
          "workaround exists. Do NOT describe a full outage or data loss.",
          "",
          "TYPE B — looks almost MEDIUM but isn't: an issue that might sound minor at",
          "first glance but actually affects MANY users or a whole account/team, not",
          "just one person (e.g. an entire team locked out of a shared workspace,",
          "scheduled reports failing for every customer on a plan tier).",
          "",
          "RULES:",
          "- Title: 5-12 words, specific.",
          "- Description: 2-4 sentences as a customer message.",
          "- The ambiguity with the neighboring tier must be obvious.",
          "",
          'Reply with STRICT JSON only: {"tickets": [{"title": "...", "description": "..."}, ...]}',
        ].join("\n"),
      },
      {
        role: "user",
        content: "Generate the 20 boundary case tickets.",
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const items: Array<{ title: string; description: string }> = parsed.tickets ?? [];

  return items
    .filter((t) => t.title?.trim() && t.description?.trim())
    .map((t) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      suggested_label: "HIGH" as const,
      source: "synthetic-high-boundary",
    }));
}

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Support Hub — HIGH-Priority Candidate Generator");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Model  : ${MODEL}`);
  console.log(`  Output : ${OUTPUT}\n`);

  const all: Candidate[] = [];

  console.log("  [HIGH] generating...");
  for (let batch = 1; batch <= 2; batch++) {
    const systems = shuffle(SYSTEMS).slice(0, 10);
    try {
      const tickets = await generateHighBatch(20, systems);
      all.push(...tickets);
      console.log(`    batch ${batch}: ${tickets.length} tickets`);
    } catch (err) {
      console.error(`    batch ${batch} failed:`, err);
    }
  }

  console.log("\n  [BOUNDARY CASES] generating...");
  try {
    const boundary = await generateBoundaryCases();
    all.push(...boundary);
    console.log(`    ${boundary.length} boundary case tickets`);
  } catch (err) {
    console.error("    boundary case generation failed:", err);
  }

  // Continue ids past gold_candidates.csv's max id to avoid collisions
  // when these rows are later merged in.
  let nextId = 1;
  if (fs.existsSync(GOLD_CANDIDATES)) {
    const existing = fs.readFileSync(GOLD_CANDIDATES, "utf-8").trim().split("\n");
    const dataLines = existing.filter((l) => /^\d/.test(l.trim()));
    const ids = dataLines.map((l) => parseInt(l.split(",")[0], 10)).filter((n) => !isNaN(n));
    if (ids.length > 0) nextId = Math.max(...ids) + 1;
  }

  const rows = shuffle(all);

  const header = [
    "id",
    "title",
    "description",
    "source",
    "suggested_label",
    "human_label",
    "notes",
  ].join(",");

  const csvRows = rows.map((t, i) =>
    [
      nextId + i,
      escapeCsv(t.title),
      escapeCsv(t.description),
      escapeCsv(t.source),
      t.suggested_label,
      "", // <- you fill this in
      "", // <- optional notes
    ].join(",")
  );

  fs.writeFileSync(OUTPUT, [header, ...csvRows].join("\n"), "utf-8");

  console.log("\n══════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Total candidates : ${rows.length}`);
  console.log(`  ids              : ${nextId}-${nextId + rows.length - 1}`);
  console.log(`\n  Written to: ${OUTPUT}`);
  console.log("\n  ┌─ NEXT STEP ──────────────────────────────────┐");
  console.log("  │ Open gold_candidates_high.csv.                │");
  console.log("  │ For each row:                                 │");
  console.log("  │   1. Read title + description                 │");
  console.log("  │   2. Confirm it's really HIGH (or relabel as │");
  console.log("  │      MEDIUM/CRITICAL if it isn't)             │");
  console.log("  │   3. Fill human_label with your judgement     │");
  console.log("  │   4. Append the labeled rows to               │");
  console.log("  │      gold_candidates.csv, then re-run         │");
  console.log("  │      gold:split and train_classifier.py       │");
  console.log("  └──────────────────────────────────────────────┘\n");
}

main().catch((e) => {
  console.error("\n❌  Error:", e);
  process.exit(1);
});
