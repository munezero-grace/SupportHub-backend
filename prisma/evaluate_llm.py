"""
LLM Evaluator — Groq / Llama on the locked test set
=====================================================
Scores every ticket in test.csv using the same Groq prompt that runs in
production (priority.service.ts), converts the numeric score to a tier label,
and computes F1 / accuracy against your human_label ground truth.

Run AFTER train_classifier.py so the comparison table is meaningful.

Usage:
    python prisma/evaluate_llm.py

Output:
    prisma/model/llm_report.txt  -- full evaluation report
    prisma/model/comparison.txt  -- ML vs LLM side-by-side table
"""

import os
import time
import pickle
from pathlib import Path

import pandas as pd
from groq import Groq
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from dotenv import load_dotenv

# ── Config ───────────────────────────────────────────────────────────────────
BASE        = Path(__file__).parent
TEST        = BASE / "test.csv"
ML_REPORT   = BASE / "model" / "report.txt"
LLM_REPORT  = BASE / "model" / "llm_report.txt"
COMPARE     = BASE / "model" / "comparison.txt"
MODEL_FILE  = BASE / "model" / "classifier.pkl"

load_dotenv(BASE.parent / ".env")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LINE = "=" * 60
THIN = "-" * 60

# ── Tier thresholds (must match PRIORITY_SCORE.md) ───────────────────────────
def score_to_tier(score: float) -> str:
    if score >= 0.80:
        return "CRITICAL"
    if score >= 0.55:
        return "HIGH"
    if score >= 0.25:
        return "MEDIUM"
    return "LOW"


# ── Groq scoring (mirrors priority.service.ts exactly) ───────────────────────
def score_ticket(client: Groq, title: str, description: str) -> dict:
    text = f"{title}\n\n{description}".strip() or "(no content)"

    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "\n".join([
                        'Score a support ticket on two axes. Reply with STRICT JSON only, no prose: {"emotion": <float 0.0-1.0>, "complexity": <float 0.0-1.0>}',
                        "",
                        "emotion -- the frustration or urgency expressed in the WRITER'S TONE and word choice only.",
                        "  0.0 = calm, polite, no urgency",
                        "  0.4 = noticeably frustrated, some urgency",
                        "  0.8 = angry, demanding, threatening consequences",
                        "  1.0 = furious, aggressive, ultimatums",
                        "Score ONLY the tone -- not the implied urgency of the topic itself.",
                        "",
                        "complexity -- the TECHNICAL severity and business impact of the problem described.",
                        "  0.0 = cosmetic only: typo, colour, grammar, spacing",
                        "  0.2 = minor UX or feature request",
                        "  0.4 = single feature degraded, workaround exists",
                        "  0.6 = one isolated feature broken, data is safe",
                        "  0.8 = core workflow broken for many users",
                        "  1.0 = system down, irreversible data loss, or active security breach",
                    ]),
                },
                {"role": "user", "content": text},
            ],
        )
        import json
        parsed   = json.loads(resp.choices[0].message.content or "{}")
        emotion  = max(0.0, min(1.0, float(parsed.get("emotion",  0.5))))
        complexity = max(0.0, min(1.0, float(parsed.get("complexity", 0.5))))
    except Exception:
        emotion, complexity = 0.5, 0.5

    # Age score = 0 for fresh synthetic tickets (no real creation date)
    priority_score = 0.4 * emotion + 0.35 * complexity
    return {
        "emotion":        emotion,
        "complexity":     complexity,
        "priority_score": priority_score,
        "predicted_tier": score_to_tier(priority_score),
    }


# ── Helpers ──────────────────────────────────────────────────────────────────
def bar(value: float, width: int = 20) -> str:
    filled = round(value * width)
    return "#" * filled + "." * (width - filled)


def write_lines(lines: list, path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for line in lines:
            f.write(line + "\n")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not found in .env")
        return

    # Load test set
    df = pd.read_csv(TEST)
    df.columns = df.columns.str.strip().str.lower()
    df["human_label"] = df["human_label"].str.strip().str.upper()
    df["title"]       = df["title"].fillna("")
    df["description"] = df["description"].fillna("")
    df = df[df["human_label"].isin(LABEL_ORDER)].copy()

    print(f"\n{LINE}")
    print("  LLM Evaluator -- Groq / Llama")
    print(LINE)
    print(f"  Model   : {GROQ_MODEL}")
    print(f"  Tickets : {len(df)}")
    print(f"  Scoring all tickets (this takes ~{len(df) * 2}s)...\n")

    client = Groq(api_key=GROQ_API_KEY)

    predictions = []
    for i, row in df.iterrows():
        result = score_ticket(client, row["title"], row["description"])
        predictions.append(result["predicted_tier"])
        pct = int((len(predictions) / len(df)) * 20)
        print(
            f"  [{len(predictions):>3}/{len(df)}]  "
            f"{'#' * pct}{'.' * (20 - pct)}  "
            f"score={result['priority_score']:.2f}  "
            f"pred={result['predicted_tier']:<9}  "
            f"true={row['human_label']}",
            end="\r",
        )
        time.sleep(0.3)   # stay well under Groq rate limit

    print("\n")

    y_true = df["human_label"].tolist()
    y_pred = predictions

    # Metrics
    llm_acc        = accuracy_score(y_true, y_pred)
    llm_macro_f1   = f1_score(y_true, y_pred, average="macro",    labels=LABEL_ORDER, zero_division=0)
    llm_weighted_f1 = f1_score(y_true, y_pred, average="weighted", labels=LABEL_ORDER, zero_division=0)
    llm_per_class  = f1_score(y_true, y_pred, average=None,        labels=LABEL_ORDER, zero_division=0)
    llm_cm         = confusion_matrix(y_true, y_pred, labels=LABEL_ORDER)
    llm_cr         = classification_report(y_true, y_pred, labels=LABEL_ORDER, digits=3, zero_division=0)

    # ── LLM report ───────────────────────────────────────────────────────────
    out = []
    out.append(f"\n{LINE}")
    out.append("  LLM Evaluation Report")
    out.append(f"  Groq / {GROQ_MODEL}")
    out.append(LINE)
    out.append(f"  Test set : {len(df)} rows  (locked gold dataset)")
    out.append(f"  Method   : zero-shot scoring, score->tier thresholds")
    out.append("")
    out.append(f"  Accuracy    : {llm_acc:.3f}")
    out.append(f"  Macro F1    : {llm_macro_f1:.3f}   {bar(llm_macro_f1)}")
    out.append(f"  Weighted F1 : {llm_weighted_f1:.3f}   {bar(llm_weighted_f1)}")
    out.append("")
    out.append("  Per-Class F1")
    out.append("  " + THIN[:50])
    for label, f1 in zip(LABEL_ORDER, llm_per_class):
        support = int(sum(1 for t in y_true if t == label))
        out.append(f"  {label:<10}  F1={f1:.3f}  {bar(f1)}  (n={support})")
    out.append("")
    out.append("  Confusion Matrix")
    out.append("  " + THIN[:50])
    out.append("  Rows = actual,  Cols = predicted")
    out.append("")
    out.append("  " + " " * 10 + "  ".join(f"{l:>8}" for l in LABEL_ORDER))
    for i, label in enumerate(LABEL_ORDER):
        row_str = "  " + f"{label:<10}" + "  ".join(
            f"{llm_cm[i][j]:>8}" for j in range(len(LABEL_ORDER))
        )
        out.append(row_str)
    out.append("")
    out.append("  Full Classification Report")
    out.append("  " + THIN[:50])
    for line in llm_cr.splitlines():
        out.append("  " + line)
    out.append("")
    out.append(LINE)

    for line in out:
        print(line)
    write_lines(out, LLM_REPORT)

    # ── Comparison table ─────────────────────────────────────────────────────
    # Load ML metrics from saved report if available, else recompute
    ml_macro_f1 = ml_acc = ml_weighted_f1 = None
    ml_per_class_f1: dict = {}

    if MODEL_FILE.exists():
        with open(MODEL_FILE, "rb") as f:
            pipeline = pickle.load(f)
        df["text"] = (df["title"] + " " + df["description"]).str.strip()
        ml_pred = pipeline.predict(df["text"])
        ml_acc        = accuracy_score(y_true, ml_pred)
        ml_macro_f1   = f1_score(y_true, ml_pred, average="macro",    labels=LABEL_ORDER, zero_division=0)
        ml_weighted_f1 = f1_score(y_true, ml_pred, average="weighted", labels=LABEL_ORDER, zero_division=0)
        ml_pc         = f1_score(y_true, ml_pred, average=None,        labels=LABEL_ORDER, zero_division=0)
        ml_per_class_f1 = dict(zip(LABEL_ORDER, ml_pc))

    cmp = []
    cmp.append(f"\n{LINE}")
    cmp.append("  COMPARISON TABLE")
    cmp.append("  ML (TF-IDF + LR)  vs  LLM (Groq zero-shot)")
    cmp.append("  Same locked test set -- 46 rows")
    cmp.append(LINE)
    cmp.append("")

    w = 14
    cmp.append("  " + "Metric".ljust(22) + "ML".rjust(w) + "LLM".rjust(w) + "Winner".rjust(w))
    cmp.append("  " + THIN[:60])

    def winner(ml_val, llm_val):
        if ml_val is None or llm_val is None:
            return "n/a"
        if abs(ml_val - llm_val) < 0.005:
            return "tie"
        return "ML" if ml_val > llm_val else "LLM"

    rows_cmp = [
        ("Accuracy",    ml_acc,        llm_acc),
        ("Macro F1",    ml_macro_f1,   llm_macro_f1),
        ("Weighted F1", ml_weighted_f1, llm_weighted_f1),
    ]
    for name, ml_v, llm_v in rows_cmp:
        ml_s  = f"{ml_v:.3f}"  if ml_v  is not None else "n/a"
        llm_s = f"{llm_v:.3f}" if llm_v is not None else "n/a"
        cmp.append(
            "  " + name.ljust(22) + ml_s.rjust(w) + llm_s.rjust(w) + winner(ml_v, llm_v).rjust(w)
        )

    cmp.append("")
    cmp.append("  Per-Class F1")
    cmp.append("  " + THIN[:60])
    cmp.append("  " + "Class".ljust(22) + "ML".rjust(w) + "LLM".rjust(w) + "Winner".rjust(w))
    cmp.append("  " + THIN[:60])

    for label, llm_f1 in zip(LABEL_ORDER, llm_per_class):
        ml_f1 = ml_per_class_f1.get(label)
        ml_s  = f"{ml_f1:.3f}" if ml_f1 is not None else "n/a"
        llm_s = f"{llm_f1:.3f}"
        cmp.append(
            "  " + label.ljust(22) + ml_s.rjust(w) + llm_s.rjust(w) + winner(ml_f1, llm_f1).rjust(w)
        )

    cmp.append("")
    cmp.append(LINE)
    cmp.append("  THESIS INTERPRETATION")
    cmp.append(LINE)
    if ml_macro_f1 and llm_macro_f1:
        diff = llm_macro_f1 - ml_macro_f1
        if diff > 0.05:
            cmp.append(f"  LLM outperforms ML by {diff:.3f} macro F1.")
            cmp.append("  Finding: general language understanding compensates for small dataset size.")
        elif diff < -0.05:
            cmp.append(f"  ML outperforms LLM by {abs(diff):.3f} macro F1.")
            cmp.append("  Finding: domain-specific patterns are learnable with limited labeled data.")
        else:
            cmp.append(f"  Models are comparable (delta={diff:+.3f} macro F1).")
            cmp.append("  Finding: lightweight ML is a cost-effective alternative to LLM scoring.")
        cmp.append("")
        cmp.append("  Cost vs performance tradeoff:")
        cmp.append(f"    ML  -- inference: <1ms, cost: $0, no API dependency")
        cmp.append(f"    LLM -- inference: ~1-2s per ticket, cost: API calls required")
    cmp.append(LINE)
    cmp.append("")

    for line in cmp:
        print(line)
    write_lines(cmp, COMPARE)

    print(f"  LLM report : {LLM_REPORT}")
    print(f"  Comparison : {COMPARE}\n")


if __name__ == "__main__":
    main()
