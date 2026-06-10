/**
 * Gold Dataset Candidate Generator
 *
 * Calls Groq to produce realistic synthetic support tickets across all four
 * urgency tiers, then writes them to prisma/gold_candidates.csv.
 *
 * The suggested_label column is Groq's suggestion — you MUST verify every row.
 * Only the human_label column you fill in manually counts as ground truth.
 *
 * Usage:  npm run gold:generate
 * Output: prisma/gold_candidates.csv
 */

import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const OUTPUT = path.resolve(__dirname, "gold_candidates.csv");

type Tier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Candidate = {
  title: string;
  description: string;
  suggested_label: Tier;
  source: string;
};

// Tier definitions that match PRIORITY_SCORE.md exactly
const TIER_DEF: Record<Tier, string> = {
  LOW: [
    "Cosmetic only: typo, colour, alignment, icon size, wording — or a feature request.",
    "The system works perfectly. No user is blocked.",
    "Tone: calm, polite, 'when convenient', 'just a thought', 'no rush'.",
  ].join(" "),

  MEDIUM: [
    "One feature is degraded but the system keeps running and a workaround exists.",
    "Examples: slow dashboard, filter not persisting, wrong timezone, unreliable export, minor data display issue.",
    "Tone: professional, mildly frustrated — 'this is annoying', 'please fix soon', 'blocking our workflow'.",
  ].join(" "),

  HIGH: [
    "A core workflow is broken for many users; the system is up but badly degraded.",
    "Examples: login broken for a user group, financial reports showing wrong totals, backups failing silently, SLA breach, notifications not sending.",
    "Tone: clearly frustrated or urgent — 'escalating this', 'unacceptable', 'we are breaching SLA'.",
  ].join(" "),

  CRITICAL: [
    "System down, irreversible data loss, or active security breach.",
    "Examples: production DB unreachable, PII exposed via API, payments completely stopped, app crash loop wiping sessions.",
    "Tone: may be furious ('FIX THIS NOW', 'legal action') OR calm and technical — both are valid edge cases.",
  ].join(" "),
};

// Systems to cover — shuffled per batch to ensure variety
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

async function generateTierBatch(
  tier: Tier,
  count: number,
  systems: string[]
): Promise<Candidate[]> {
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
          `URGENCY TIER: ${tier}`,
          `DEFINITION: ${TIER_DEF[tier]}`,
          "",
          "RULES:",
          `- Generate exactly ${count} tickets.`,
          `- Cover a variety of these systems: ${systems.join(", ")}.`,
          "- Title: 5–12 words, specific, no generic phrases.",
          "- Description: 2–4 sentences written as a real customer message.",
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
        content: `Generate ${count} ${tier} urgency support tickets.`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const items: Array<{ title: string; description: string }> =
    parsed.tickets ?? [];

  return items
    .filter((t) => t.title?.trim() && t.description?.trim())
    .map((t) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      suggested_label: tier,
      source: "synthetic",
    }));
}

async function generateEdgeCases(): Promise<Candidate[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: [
          "You generate intentional edge-case support tickets where tone does NOT match severity.",
          "These hard cases are critical for training a robust ML classifier.",
          "",
          "Generate 5 tickets for each of these 4 types (20 total):",
          "",
          "TYPE A — label: LOW — calm polite tone, genuinely cosmetic or trivial issue.",
          "TYPE B — label: CRITICAL — calm, dry, technical tone describing system down or data loss (no panic).",
          "TYPE C — label: LOW — ANGRY furious tone, but the actual problem is cosmetic or trivial.",
          "TYPE D — label: HIGH — very casual friendly tone, but a core feature is broken for many users.",
          "",
          "RULES:",
          "- Title: 5–12 words, specific.",
          "- Description: 2–3 sentences as a customer message.",
          "- The contrast between tone and severity must be obvious.",
          "",
          'Reply with STRICT JSON only: {"tickets": [{"title": "...", "description": "...", "suggested_label": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}, ...]}',
        ].join("\n"),
      },
      {
        role: "user",
        content: "Generate the 20 edge case tickets.",
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const items: Array<{
    title: string;
    description: string;
    suggested_label: string;
  }> = parsed.tickets ?? [];

  const validTiers = new Set<string>(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

  return items
    .filter(
      (t) =>
        t.title?.trim() &&
        t.description?.trim() &&
        validTiers.has(t.suggested_label)
    )
    .map((t) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      suggested_label: t.suggested_label as Tier,
      source: "synthetic-edge",
    }));
}

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Support Hub — Gold Dataset Candidate Generator");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Model  : ${MODEL}`);
  console.log(`  Output : ${OUTPUT}\n`);

  const all: Candidate[] = [];
  const TIERS: Tier[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  // Two batches of 25 per tier — keeps each Groq call small and reliable
  for (const tier of TIERS) {
    console.log(`  [${tier}] generating...`);

    for (let batch = 1; batch <= 2; batch++) {
      const systems = shuffle(SYSTEMS).slice(0, 10);
      try {
        const tickets = await generateTierBatch(tier, 25, systems);
        all.push(...tickets);
        console.log(`    batch ${batch}: ${tickets.length} tickets`);
      } catch (err) {
        console.error(`    batch ${batch} failed:`, err);
      }
    }

    const tierCount = all.filter((t) => t.suggested_label === tier).length;
    console.log(`    subtotal: ${tierCount}\n`);
  }

  // Edge cases
  console.log("  [EDGE CASES] generating...");
  try {
    const edges = await generateEdgeCases();
    all.push(...edges);
    console.log(`    ${edges.length} edge case tickets\n`);
  } catch (err) {
    console.error("    edge case generation failed:", err);
  }

  // Shuffle rows so tiers are interleaved — reduces labeling bias
  const rows = shuffle(all);

  // Write CSV
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
      i + 1,
      escapeCsv(t.title),
      escapeCsv(t.description),
      escapeCsv(t.source),
      t.suggested_label,
      "",  // ← you fill this in
      "",  // ← optional notes
    ].join(",")
  );

  fs.writeFileSync(OUTPUT, [header, ...csvRows].join("\n"), "utf-8");

  // Summary
  console.log("══════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Total candidates : ${rows.length}`);
  for (const tier of TIERS) {
    const n = rows.filter((t) => t.suggested_label === tier).length;
    console.log(`  ${tier.padEnd(12)}: ${n}`);
  }
  const edges = rows.filter((t) => t.source === "synthetic-edge").length;
  console.log(`  Edge cases   : ${edges}`);
  console.log(`\n  Written to: ${OUTPUT}`);
  console.log("\n  ┌─ NEXT STEP ──────────────────────────────────┐");
  console.log("  │ Open gold_candidates.csv in Excel or Sheets. │");
  console.log("  │ For each row:                                 │");
  console.log("  │   1. Read title + description                 │");
  console.log("  │   2. Verify suggested_label is correct        │");
  console.log("  │   3. Fill human_label (LOW/MEDIUM/HIGH/       │");
  console.log("  │      CRITICAL) based on YOUR judgement        │");
  console.log("  │   4. Add notes if the case is ambiguous       │");
  console.log("  └──────────────────────────────────────────────┘\n");
}

main().catch((e) => {
  console.error("\n❌  Error:", e);
  process.exit(1);
});
