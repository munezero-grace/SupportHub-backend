/**
 * Stratified Train/Test Split
 *
 * Reads gold_candidates.csv and splits it into:
 *   prisma/train.csv  — 80% of each class (for ML classifier training)
 *   prisma/test.csv   — 20% of each class (locked evaluation set)
 *
 * Stratified: each class is split independently so both files have
 * the same class proportions. The split is seeded for reproducibility.
 *
 * Usage: npm run gold:split
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT  = path.resolve(__dirname, "gold_candidates.csv");
const TRAIN  = path.resolve(__dirname, "train.csv");
const TEST   = path.resolve(__dirname, "test.csv");

const TRAIN_RATIO = 0.8;
const SEED = 42;

type Row = Record<string, string>;

// ── Deterministic shuffle (seeded LCG) ──────────────────────────────────────
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      fields.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function escapeCsv(val: string): string {
  return `"${String(val).replace(/"/g, '""')}"`;
}

async function readCsv(filePath: string): Promise<{ headers: string[]; rows: Row[] }> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  const rows: Row[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseLine(line);
    if (fields.every((f) => f.trim() === "")) continue;
    if (isFirst) {
      headers = fields.map((h) => h.trim().toLowerCase());
      isFirst = false;
      continue;
    }
    const obj: Row = {};
    headers.forEach((h, i) => { obj[h] = (fields[i] ?? "").trim(); });
    rows.push(obj);
  }

  return { headers, rows };
}

function writeCsv(filePath: string, headers: string[], rows: Row[]): void {
  const header = headers.join(",");
  const lines = rows.map((r) =>
    headers.map((h) => {
      const v = r[h] ?? "";
      return v.includes(",") || v.includes('"') || v.includes("\n")
        ? escapeCsv(v)
        : v;
    }).join(",")
  );
  fs.writeFileSync(filePath, [header, ...lines].join("\n"), "utf-8");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const LINE  = "═".repeat(60);
  const THIN  = "─".repeat(60);

  console.log(`\n${LINE}`);
  console.log("  Stratified Train / Test Split");
  console.log(LINE);
  console.log(`  Ratio : ${TRAIN_RATIO * 100}% train / ${(1 - TRAIN_RATIO) * 100}% test`);
  console.log(`  Seed  : ${SEED} (reproducible)\n`);

  const { headers, rows } = await readCsv(INPUT);

  const TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const trainRows: Row[] = [];
  const testRows:  Row[] = [];

  console.log("  Per-class split");
  console.log("  " + THIN.slice(0, 52));
  console.log(
    "  " +
    "Class".padEnd(12) +
    "Total".padStart(7) +
    "Train".padStart(7) +
    "Test".padStart(6)
  );
  console.log("  " + THIN.slice(0, 52));

  for (const tier of TIERS) {
    const tierRows = rows.filter(
      (r) => (r.human_label ?? "").toUpperCase() === tier
    );
    const shuffled   = seededShuffle(tierRows, SEED + TIERS.indexOf(tier));
    const splitAt    = Math.round(shuffled.length * TRAIN_RATIO);
    const tierTrain  = shuffled.slice(0, splitAt);
    const tierTest   = shuffled.slice(splitAt);

    trainRows.push(...tierTrain);
    testRows.push(...tierTest);

    console.log(
      "  " +
      tier.padEnd(12) +
      String(tierRows.length).padStart(7) +
      String(tierTrain.length).padStart(7) +
      String(tierTest.length).padStart(6)
    );
  }

  // Shuffle final files so tiers are interleaved
  const trainShuffled = seededShuffle(trainRows, SEED);
  const testShuffled  = seededShuffle(testRows,  SEED + 99);

  writeCsv(TRAIN, headers, trainShuffled);
  writeCsv(TEST,  headers, testShuffled);

  console.log("  " + THIN.slice(0, 52));
  console.log(
    "  " +
    "TOTAL".padEnd(12) +
    String(rows.length).padStart(7) +
    String(trainShuffled.length).padStart(7) +
    String(testShuffled.length).padStart(6)
  );

  console.log(`\n  Written:`);
  console.log(`    train.csv → ${trainShuffled.length} rows`);
  console.log(`    test.csv  → ${testShuffled.length} rows`);

  console.log(`\n${LINE}`);
  console.log("  IMPORTANT — test.csv is now LOCKED.");
  console.log("  Do not look at it, train on it, or tune against it.");
  console.log("  It is used only for final evaluation.");
  console.log(`${LINE}\n`);
}

main().catch((e) => {
  console.error("\n❌  Error:", e);
  process.exit(1);
});
