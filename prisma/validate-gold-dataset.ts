/**
 * Gold Dataset Validator
 *
 * Reads gold_candidates.csv, checks for completeness and class balance,
 * flags problem rows, and prints a summary report.
 *
 * Usage: npm run gold:validate
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT = path.resolve(__dirname, "gold_candidates.csv");

type Row = {
  id: string;
  title: string;
  description: string;
  source: string;
  suggested_label: string;
  human_label: string;
  notes: string;
};

const VALID_LABELS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const LINE = "═".repeat(64);
const THIN = "─".repeat(64);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function readCsv(filePath: string): Promise<Row[]> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });

  const rows: Row[] = [];
  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (fields.every((f) => f.trim() === "")) continue;
    if (isFirst) {
      headers = fields.map((h) => h.trim().toLowerCase());
      isFirst = false;
      continue;
    }
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (fields[i] ?? "").trim();
    });
    rows.push(obj as unknown as Row);
  }

  return rows;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`\n❌  File not found: ${INPUT}`);
    console.error(
      "    Download your labeled CSV from Google Sheets and place it there.\n"
    );
    process.exit(1);
  }

  const rows = await readCsv(INPUT);

  console.log(`\n${LINE}`);
  console.log("  Gold Dataset Validation Report");
  console.log(LINE);
  console.log(`  File   : ${INPUT}`);
  console.log(`  Rows   : ${rows.length}`);
  console.log();

  // ── 1. Missing human_label ───────────────────────────────────────────────
  const unlabeled = rows.filter((r) => !r.human_label);
  const invalid = rows.filter(
    (r) => r.human_label && !VALID_LABELS.has(r.human_label.toUpperCase())
  );

  if (unlabeled.length > 0) {
    console.log(`  ⚠️  Unlabeled rows (${unlabeled.length}):`);
    unlabeled.slice(0, 10).forEach((r) => {
      console.log(`     [${r.id.padStart(3)}] ${r.title.slice(0, 55)}`);
    });
    if (unlabeled.length > 10)
      console.log(`     … and ${unlabeled.length - 10} more`);
    console.log();
  }

  if (invalid.length > 0) {
    console.log(`  ❌  Invalid label values (${invalid.length}):`);
    invalid.forEach((r) => {
      console.log(
        `     [${r.id.padStart(3)}] "${r.human_label}" — ${r.title.slice(0, 45)}`
      );
    });
    console.log();
  }

  // ── 2. Class distribution ────────────────────────────────────────────────
  const labeled = rows.filter((r) => VALID_LABELS.has(r.human_label?.toUpperCase()));
  const counts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  labeled.forEach((r) => counts[r.human_label.toUpperCase()]++);

  console.log(`  Class Distribution (${labeled.length} labeled rows)`);
  console.log("  " + THIN.slice(0, 50));

  const total = labeled.length;
  for (const tier of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) {
    const n = counts[tier];
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
    const bar = "█".repeat(Math.round((n / Math.max(...Object.values(counts))) * 20)).padEnd(20);
    const warn = n < 40 ? " ⚠️  (under 40 — consider adding more)" : "";
    console.log(`  ${tier.padEnd(10)} ${String(n).padStart(4)}  ${pct.padStart(5)}%  ${bar}${warn}`);
  }

  // ── 3. Label disagreements (you vs Groq) ────────────────────────────────
  const disagreements = labeled.filter(
    (r) =>
      r.suggested_label &&
      r.human_label.toUpperCase() !== r.suggested_label.toUpperCase()
  );

  console.log();
  console.log(
    `  Label Disagreements (you vs Groq): ${disagreements.length} of ${labeled.length}`
  );
  console.log("  " + THIN.slice(0, 50));

  if (disagreements.length > 0) {
    const upgrades = disagreements.filter(
      (r) =>
        severityRank(r.human_label) > severityRank(r.suggested_label)
    ).length;
    const downgrades = disagreements.filter(
      (r) =>
        severityRank(r.human_label) < severityRank(r.suggested_label)
    ).length;
    console.log(`  You upgraded   : ${upgrades} tickets (labeled more severe than Groq)`);
    console.log(`  You downgraded : ${downgrades} tickets (labeled less severe than Groq)`);
    console.log();
    console.log("  First 10 disagreements:");
    disagreements.slice(0, 10).forEach((r) => {
      console.log(
        `  [${r.id.padStart(3)}] Groq=${r.suggested_label.padEnd(9)} You=${r.human_label.padEnd(9)} ${r.title.slice(0, 42)}`
      );
    });
    if (disagreements.length > 10)
      console.log(`  … and ${disagreements.length - 10} more`);
  }

  // ── 4. Edge case summary ─────────────────────────────────────────────────
  const edgeCases = labeled.filter((r) => r.source === "synthetic-edge");
  console.log();
  console.log(`  Edge Cases: ${edgeCases.length} rows (source = synthetic-edge)`);

  // ── 5. Overall verdict ───────────────────────────────────────────────────
  const minCount = Math.min(...Object.values(counts));
  const allLabeled = unlabeled.length === 0;
  const noInvalid = invalid.length === 0;
  const balanced = minCount >= 40;
  const enoughData = total >= 150;

  console.log();
  console.log(LINE);
  console.log("  VERDICT");
  console.log(LINE);
  console.log(`  All rows labeled   : ${allLabeled ? "✅" : "❌"} (${unlabeled.length} missing)`);
  console.log(`  No invalid labels  : ${noInvalid ? "✅" : "❌"} (${invalid.length} bad values)`);
  console.log(`  Minimum class ≥ 40 : ${balanced ? "✅" : "⚠️ "} (smallest class: ${minCount})`);
  console.log(`  Total ≥ 150        : ${enoughData ? "✅" : "⚠️ "} (${total} labeled)`);

  const ready = allLabeled && noInvalid && balanced && enoughData;
  console.log();
  if (ready) {
    console.log("  ✅  Dataset is ready for train/test split.");
    console.log("      Run  npm run gold:split  next.");
  } else {
    console.log("  ⚠️   Fix the issues above before splitting.");
  }
  console.log(LINE + "\n");

  if (!allLabeled || !noInvalid) process.exit(1);
}

function severityRank(label: string): number {
  const ranks: Record<string, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
  };
  return ranks[label?.toUpperCase()] ?? -1;
}

main().catch((e) => {
  console.error("\n❌  Error:", e);
  process.exit(1);
});
