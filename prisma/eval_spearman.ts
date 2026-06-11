/**
 * Classifier Spearman Rank Correlation Evaluation
 *
 * Loads the locked test.csv set, runs the trained classifier
 * (prisma/model/classifier.pkl) on every ticket via predict_test_set.py,
 * and compares the predicted priority ranking against the human-labeled
 * ranking using Spearman's rank correlation coefficient (rs).
 *
 * Usage:
 *   npm run eval:spearman
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BASE = path.resolve(__dirname);
const TEST_FILE = path.join(BASE, "test.csv");
const PREDICT_SCRIPT = path.join(BASE, "predict_test_set.py");

const ORDINAL: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

type TestRow = {
  id: number;
  title: string;
  human_label: string;
};

type Prediction = {
  id: number;
  predicted_label: string;
  predicted_score: number;
};

// ---------------------------------------------------------------------------
// CSV parsing (handles quoted fields with embedded commas)
// ---------------------------------------------------------------------------
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = fields[i] ?? ""));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  fields.push(cur);
  return fields;
}

// ---------------------------------------------------------------------------
// Spearman rank correlation (handles ties via average ranks)
// ---------------------------------------------------------------------------
function rankWithTies(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    // average rank (1-based) for tied group [i, j]
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function spearman(x: number[], y: number[]): number {
  const n = x.length;
  const rx = rankWithTies(x);
  const ry = rankWithTies(y);

  const meanRx = rx.reduce((a, b) => a + b, 0) / n;
  const meanRy = ry.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - meanRx;
    const dy = ry[i] - meanRy;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return 0;
  return cov / Math.sqrt(varX * varY);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Classifier — Spearman Rank Correlation Evaluation");
  console.log("══════════════════════════════════════════════════\n");

  if (!fs.existsSync(TEST_FILE)) {
    throw new Error(`test.csv not found at ${TEST_FILE}`);
  }

  const testRows = parseCsv(fs.readFileSync(TEST_FILE, "utf-8")) as unknown as TestRow[];
  console.log(`  Loaded ${testRows.length} rows from test.csv`);

  console.log("  Running classifier on test set (predict_test_set.py)...");
  const stdout = execFileSync("python", [PREDICT_SCRIPT], {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const predictions: Prediction[] = JSON.parse(stdout);
  const predById = new Map(predictions.map((p) => [String(p.id), p]));

  const humanOrdinal: number[] = [];
  const predictedScore: number[] = [];
  let tierMatches = 0;
  let n = 0;

  for (const row of testRows) {
    const pred = predById.get(String((row as any).id));
    const humanLabel = (row.human_label || "").trim().toUpperCase();
    if (!pred || !(humanLabel in ORDINAL)) continue;

    humanOrdinal.push(ORDINAL[humanLabel]);
    predictedScore.push(pred.predicted_score);
    if (pred.predicted_label === humanLabel) tierMatches++;
    n++;
  }

  const rs = spearman(predictedScore, humanOrdinal);
  const tierAccuracy = (tierMatches / n) * 100;

  const rsGrade =
    rs >= 0.9 ? "EXCELLENT" : rs >= 0.8 ? "GOOD" : rs >= 0.6 ? "FAIR" : "POOR";

  console.log(`\n  Tickets evaluated        : ${n}`);
  console.log(`  Tier classification acc. : ${tierAccuracy.toFixed(1)}% (${tierMatches}/${n})`);
  console.log(`  Spearman rank correlation : ${rs.toFixed(4)}  [${rsGrade}]`);
  console.log("\n══════════════════════════════════════════════════\n");
}

main();
