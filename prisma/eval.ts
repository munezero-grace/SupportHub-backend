/**
 * Priority Engine Evaluation Script
 *
 * Reads the eval-dataset tickets seeded by seed-eval.ts, compares the engine's
 * ranked order against the human-assigned ground-truth ranking, and computes:
 *   • Spearman rank correlation
 *   • Tier classification accuracy (Critical / High / Medium / Low)
 *   • Perfect rank matches and within-±2 coverage
 *   • Mean absolute rank error
 *
 * Usage:
 *   npm run eval:run         — print the report
 *   npm run eval:cleanup     — delete all eval-dataset tickets
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();
const IS_CLEANUP = process.argv.includes("--cleanup");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EvalRow = {
  ticketCode: string;
  title: string;
  humanRank: number;
  humanTier: string;
  engineRank: number;
  priorityScore: number;
  engineTier: string;
  delta: number;       // engineRank − humanRank  (0 = perfect match)
  tierMatch: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function tierFromScore(score: number): string {
  if (score >= 0.80) return "Critical";
  if (score >= 0.55) return "High";
  if (score >= 0.25) return "Medium";
  return "Low";
}

function spearman(rows: EvalRow[]): number {
  const n = rows.length;
  if (n <= 1) return 1;
  const sumD2 = rows.reduce((s, r) => s + r.delta * r.delta, 0);
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

function pad(str: string | number, w: number): string {
  return String(str).padEnd(w);
}
function lpad(str: string | number, w: number): string {
  return String(str).padStart(w);
}
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
const LINE = "═".repeat(96);
const THIN = "─".repeat(96);

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
async function runCleanup() {
  console.log("\n  Removing eval-dataset tickets…");
  const result = await prisma.tickets.deleteMany({
    where: { tags: { has: "eval-dataset" } },
  });
  console.log(`  ✅  Deleted ${result.count} eval tickets.\n`);
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------
async function runEval() {
  // Fetch all eval tickets already sorted by engine order (score desc)
  const tickets = await prisma.tickets.findMany({
    where: { tags: { has: "eval-dataset" } },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
  });

  if (tickets.length === 0) {
    console.log(
      "\n⚠️   No eval tickets found. Run  npm run eval:seed  first.\n"
    );
    return;
  }

  // Build rows
  const rows: EvalRow[] = tickets.map((t, i) => {
    const rankTag = t.tags.find((x) => x.startsWith("eval-rank-"));
    const tierTag = t.tags.find((x) => x.startsWith("eval-tier-"));
    const humanRank = rankTag ? parseInt(rankTag.slice("eval-rank-".length), 10) : 0;
    const humanTier = tierTag ? tierTag.slice("eval-tier-".length) : "?";
    const score = t.priorityScore ?? 0;
    const engineRank = i + 1;
    const engineTier = tierFromScore(score);
    const delta = engineRank - humanRank;

    return {
      ticketCode: t.ticketCode,
      title: t.title,
      humanRank,
      humanTier,
      engineRank,
      priorityScore: score,
      engineTier,
      delta,
      tierMatch: humanTier === engineTier,
    };
  });

  // Display sorted by human rank so mismatches are easy to spot
  const byHuman = [...rows].sort((a, b) => a.humanRank - b.humanRank);

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------
  const rs = spearman(rows);
  const n = rows.length;
  const tierMatches = rows.filter((r) => r.tierMatch).length;
  const tierAccuracy = (tierMatches / n) * 100;
  const exact = rows.filter((r) => r.delta === 0).length;
  const within2 = rows.filter((r) => Math.abs(r.delta) <= 2).length;
  const mae = rows.reduce((s, r) => s + Math.abs(r.delta), 0) / n;

  const rsGrade =
    rs >= 0.9 ? "EXCELLENT" : rs >= 0.8 ? "GOOD" : rs >= 0.6 ? "FAIR" : "POOR";
  const rsThreshold = "threshold ≥ 0.80";

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  console.log(`\n${LINE}`);
  console.log(`  Support Hub — Priority Engine Evaluation Report`);
  console.log(
    `  ${new Date().toLocaleString()}   |   Dataset: ${n} tickets`
  );
  console.log(LINE);

  // ---------------------------------------------------------------------------
  // Comparison table
  // ---------------------------------------------------------------------------
  const COL = {
    hr: 8,  // human rank
    er: 8,  // engine rank
    d: 6,   // delta
    sc: 8,  // score
    ht: 13, // human tier
    et: 13, // engine tier
    ti: 38, // title
  };

  console.log();
  console.log(
    "  " +
      pad("H.Rank", COL.hr) +
      pad("E.Rank", COL.er) +
      pad("Δ", COL.d) +
      pad("Score", COL.sc) +
      pad("H.Tier", COL.ht) +
      pad("E.Tier", COL.et) +
      "Title"
  );
  console.log("  " + THIN.slice(0, 92));

  for (const r of byHuman) {
    const deltaStr =
      r.delta === 0 ? "0" : r.delta > 0 ? `+${r.delta}` : `${r.delta}`;
    const tier = r.tierMatch ? `${r.engineTier} ✓` : `${r.engineTier} ✗`;
    console.log(
      "  " +
        pad(r.humanRank, COL.hr) +
        pad(r.engineRank, COL.er) +
        pad(deltaStr, COL.d) +
        pad((r.priorityScore * 100).toFixed(1) + "%", COL.sc) +
        pad(r.humanTier, COL.ht) +
        pad(tier, COL.et) +
        trunc(r.title, COL.ti)
    );
  }

  console.log(
    "\n  H.Rank = human rank  |  E.Rank = engine rank  |  Δ = E.Rank − H.Rank  |  ✓/✗ = tier match"
  );

  // ---------------------------------------------------------------------------
  // Summary metrics
  // ---------------------------------------------------------------------------
  console.log(`\n${LINE}`);
  console.log("  RESULTS SUMMARY");
  console.log(LINE);
  console.log();
  console.log(
    `  Spearman Rank Correlation (rs)  ${lpad(rs.toFixed(4), 8)}    [${rsGrade} — ${rsThreshold}]`
  );
  console.log(
    `  Tier Classification Accuracy    ${lpad(tierAccuracy.toFixed(1) + "%", 8)}    ${tierMatches}/${n} tickets correct   [threshold ≥ 75%]`
  );
  console.log(
    `  Perfect Rank Matches (Δ = 0)    ${lpad(exact + "/" + n, 8)}    (${((exact / n) * 100).toFixed(0)}%)`
  );
  console.log(
    `  Within ±2 Ranks  (|Δ| ≤ 2)     ${lpad(within2 + "/" + n, 8)}    (${((within2 / n) * 100).toFixed(0)}%)`
  );
  console.log(
    `  Mean Absolute Rank Error (MAE)  ${lpad(mae.toFixed(2), 8)}`
  );

  // ---------------------------------------------------------------------------
  // Per-tier breakdown
  // ---------------------------------------------------------------------------
  const TIERS = ["Critical", "High", "Medium", "Low"];
  console.log(`\n  Per-Tier Breakdown`);
  console.log("  " + THIN.slice(0, 60));
  console.log(
    "  " +
      pad("Tier", 12) +
      pad("Human", 8) +
      pad("Engine", 8) +
      pad("Correct", 10) +
      "Accuracy"
  );
  console.log("  " + THIN.slice(0, 60));

  for (const tier of TIERS) {
    const hCount = rows.filter((r) => r.humanTier === tier).length;
    const eCount = rows.filter((r) => r.engineTier === tier).length;
    const correct = rows.filter((r) => r.humanTier === tier && r.tierMatch).length;
    const acc = hCount > 0 ? ((correct / hCount) * 100).toFixed(0) + "%" : "n/a";
    console.log(
      "  " +
        pad(tier, 12) +
        pad(hCount, 8) +
        pad(eCount, 8) +
        pad(correct, 10) +
        acc
    );
  }

  // ---------------------------------------------------------------------------
  // Largest mismatches — top 5 worst-ranked tickets
  // ---------------------------------------------------------------------------
  const worst = [...rows]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  console.log(`\n  Top Mismatches (largest |Δ|)`);
  console.log("  " + THIN.slice(0, 80));
  for (const r of worst) {
    const dir = r.delta > 0 ? "ranked lower than expected" : "ranked higher than expected";
    console.log(
      `  [Δ=${r.delta > 0 ? "+" : ""}${r.delta}]  H${r.humanRank}→E${r.engineRank}  ${dir}`
    );
    console.log(`         ${trunc(r.title, 72)}`);
  }

  console.log(`\n${LINE}`);

  // ---------------------------------------------------------------------------
  // Pass / fail verdict
  // ---------------------------------------------------------------------------
  const passed = rs >= 0.8 && tierAccuracy >= 75;
  if (passed) {
    console.log(
      "  ✅  PASS — engine meets both quality thresholds (rs ≥ 0.80, tier accuracy ≥ 75%)."
    );
  } else {
    console.log("  ❌  FAIL — one or more thresholds not met:");
    if (rs < 0.8) console.log(`       • Spearman rs = ${rs.toFixed(4)} (need ≥ 0.80)`);
    if (tierAccuracy < 75)
      console.log(`       • Tier accuracy = ${tierAccuracy.toFixed(1)}% (need ≥ 75%)`);
    console.log(
      "       Review the Groq prompt in src/services/priority.service.ts."
    );
  }

  console.log(`${LINE}\n`);

  if (!passed) process.exit(1);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
async function main() {
  if (IS_CLEANUP) {
    await runCleanup();
  } else {
    await runEval();
  }
}

main()
  .catch((e) => {
    console.error("\n❌  Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
