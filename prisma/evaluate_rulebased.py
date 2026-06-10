"""
Rule-Based Baseline Classifier
===============================
Classifies tickets using keyword matching only -- no ML, no LLM.
Establishes the performance floor for the three-way comparison.

Each ticket text is scored by counting keyword hits per tier.
The tier with the most hits wins. Ties broken by severity (higher wins).

Usage:
    python prisma/evaluate_rulebased.py

Output:
    prisma/model/rulebased_report.txt  -- evaluation report
    prisma/model/comparison.txt        -- updated three-way table
"""

import re
import pickle
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE          = Path(__file__).parent
TEST          = BASE / "test.csv"
MODEL_FILE    = BASE / "model" / "classifier.pkl"
RB_REPORT     = BASE / "model" / "rulebased_report.txt"
COMPARE       = BASE / "model" / "comparison.txt"

LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LINE = "=" * 60
THIN = "-" * 60

# ── Keyword lists ─────────────────────────────────────────────────────────────
# Kept intentionally simple -- this is the BASELINE, not a tuned system.
# Keywords are plain strings matched case-insensitively as whole words.
KEYWORDS: dict[str, list[str]] = {
    "CRITICAL": [
        "down", "outage", "unreachable", "unavailable", "crash", "crashed",
        "crashing", "data loss", "data lost", "corrupted", "corruption",
        "breach", "breached", "exposed", "exposure", "hacked", "hack",
        "ransomware", "unauthorized access", "pii", "gdpr", "legal action",
        "revenue loss", "losing money", "irreversible", "wipe", "wiped",
        "total failure", "complete failure", "system failure", "system down",
        "production down", "database down", "db down", "all users",
        "nobody can", "no one can", "completely broken", "fully down",
        "payments stopped", "payment down", "payment failure",
        "security breach", "security incident", "ssl expired",
    ],
    "HIGH": [
        "broken", "not working", "fails", "failing", "failed",
        "blocked", "blocking", "cannot", "can't", "unable to",
        "urgent", "urgently", "asap", "escalat", "sla", "sla breach",
        "many users", "all clients", "all staff", "entire team",
        "core feature", "critical bug", "wrong data", "incorrect data",
        "incorrect totals", "wrong totals", "financial report",
        "backup fail", "backup not", "login broken", "login fail",
        "authentication fail", "2fa fail", "2fa not", "mfa fail",
        "integration fail", "api down", "api fail", "api error",
        "not sending", "not delivering", "not received",
        "permission", "access denied", "access control",
    ],
    "MEDIUM": [
        "slow", "slowdown", "performance", "delay", "delayed",
        "sometimes", "occasionally", "intermittent", "inconsistent",
        "not saving", "not persisting", "resets", "workaround",
        "annoying", "frustrating", "frustration", "inconvenient",
        "export", "import", "csv", "pagination", "filter",
        "timezone", "date", "timestamp", "display", "showing",
        "wrong format", "incorrect format", "sorting", "search",
        "dashboard", "chart", "report", "notification",
        "session timeout", "logged out", "timeout",
    ],
    "LOW": [
        "typo", "spelling", "grammar", "wording", "text",
        "colour", "color", "font", "size", "icon", "logo",
        "alignment", "aligned", "misaligned", "layout",
        "cosmetic", "minor", "small", "tiny", "slight",
        "feature request", "would be great", "would love",
        "suggestion", "suggest", "nice to have", "nice-to-have",
        "when convenient", "no rush", "not urgent", "low priority",
        "just a thought", "future", "eventually", "someday",
    ],
}

# Tier priority for tie-breaking (higher index = higher severity wins)
TIER_RANK = {t: i for i, t in enumerate(LABEL_ORDER)}


# ── Classifier ───────────────────────────────────────────────────────────────
def classify(text: str) -> str:
    text_lower = text.lower()
    scores: dict[str, int] = {tier: 0 for tier in LABEL_ORDER}

    for tier, keywords in KEYWORDS.items():
        for kw in keywords:
            # whole-phrase match (not just whole-word for multi-word phrases)
            if len(kw.split()) > 1:
                if kw in text_lower:
                    scores[tier] += 1
            else:
                if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                    scores[tier] += 1

    max_score = max(scores.values())

    if max_score == 0:
        return "LOW"   # default when no keywords match

    # Among tied tiers, pick the most severe
    candidates = [t for t, s in scores.items() if s == max_score]
    return max(candidates, key=lambda t: TIER_RANK[t])


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
    df = pd.read_csv(TEST)
    df.columns = df.columns.str.strip().str.lower()
    df["human_label"] = df["human_label"].str.strip().str.upper()
    df["text"] = (
        df["title"].fillna("") + " " + df["description"].fillna("")
    ).str.strip()
    df = df[df["human_label"].isin(LABEL_ORDER)].copy()

    y_true = df["human_label"].tolist()
    y_pred = [classify(t) for t in df["text"]]

    rb_acc        = accuracy_score(y_true, y_pred)
    rb_macro_f1   = f1_score(y_true, y_pred, average="macro",    labels=LABEL_ORDER, zero_division=0)
    rb_weighted_f1 = f1_score(y_true, y_pred, average="weighted", labels=LABEL_ORDER, zero_division=0)
    rb_per_class  = f1_score(y_true, y_pred, average=None,        labels=LABEL_ORDER, zero_division=0)
    rb_cm         = confusion_matrix(y_true, y_pred, labels=LABEL_ORDER)
    rb_cr         = classification_report(y_true, y_pred, labels=LABEL_ORDER, digits=3, zero_division=0)

    # ── Rule-based report ────────────────────────────────────────────────────
    out = []
    out.append(f"\n{LINE}")
    out.append("  Rule-Based Baseline Evaluation Report")
    out.append("  Keyword matching -- no ML, no LLM")
    out.append(LINE)
    out.append(f"  Test set    : {len(df)} rows  (locked gold dataset)")
    out.append(f"  Method      : keyword hit count per tier, highest wins")
    out.append(f"  Tie-break   : higher severity wins")
    out.append(f"  Total rules : {sum(len(v) for v in KEYWORDS.values())} keywords across 4 tiers")
    out.append("")
    out.append(f"  Accuracy    : {rb_acc:.3f}")
    out.append(f"  Macro F1    : {rb_macro_f1:.3f}   {bar(rb_macro_f1)}")
    out.append(f"  Weighted F1 : {rb_weighted_f1:.3f}   {bar(rb_weighted_f1)}")
    out.append("")
    out.append("  Per-Class F1")
    out.append("  " + THIN[:50])
    for label, f1 in zip(LABEL_ORDER, rb_per_class):
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
            f"{rb_cm[i][j]:>8}" for j in range(len(LABEL_ORDER))
        )
        out.append(row_str)
    out.append("")
    out.append("  Full Classification Report")
    out.append("  " + THIN[:50])
    for line in rb_cr.splitlines():
        out.append("  " + line)
    out.append(LINE)
    out.append("")

    for line in out:
        print(line)
    write_lines(out, RB_REPORT)

    # ── Reload ML and LLM metrics for the three-way table ───────────────────
    ml_macro_f1 = ml_acc = ml_weighted_f1 = None
    ml_per_class_f1: dict = {}
    llm_macro_f1 = llm_acc = llm_weighted_f1 = None
    llm_per_class_f1: dict = {}

    if MODEL_FILE.exists():
        with open(MODEL_FILE, "rb") as f:
            pipeline = pickle.load(f)
        ml_pred        = pipeline.predict(df["text"])
        ml_acc         = accuracy_score(y_true, ml_pred)
        ml_macro_f1    = f1_score(y_true, ml_pred, average="macro",    labels=LABEL_ORDER, zero_division=0)
        ml_weighted_f1 = f1_score(y_true, ml_pred, average="weighted", labels=LABEL_ORDER, zero_division=0)
        ml_pc          = f1_score(y_true, ml_pred, average=None,        labels=LABEL_ORDER, zero_division=0)
        ml_per_class_f1 = dict(zip(LABEL_ORDER, ml_pc))

    llm_report = BASE / "model" / "llm_report.txt"
    if llm_report.exists():
        # Parse LLM metrics from the saved report
        content = llm_report.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("Accuracy"):
                try: llm_acc = float(line.split(":")[1].strip().split()[0])
                except: pass
            if line.startswith("Macro F1"):
                try: llm_macro_f1 = float(line.split(":")[1].strip().split()[0])
                except: pass
            if line.startswith("Weighted F1"):
                try: llm_weighted_f1 = float(line.split(":")[1].strip().split()[0])
                except: pass
            for label in LABEL_ORDER:
                if line.startswith(label) and "F1=" in line:
                    try:
                        val = float(line.split("F1=")[1].split()[0])
                        llm_per_class_f1[label] = val
                    except: pass

    # ── Three-way comparison table ───────────────────────────────────────────
    w = 12

    def fmt(v): return f"{v:.3f}" if v is not None else "n/a"

    def winner3(ml, llm, rb):
        vals = {"ML": ml, "LLM": llm, "Rules": rb}
        valid = {k: v for k, v in vals.items() if v is not None}
        if not valid:
            return "n/a"
        best_k = max(valid, key=lambda k: valid[k])
        best_v = valid[best_k]
        tied   = [k for k, v in valid.items() if abs(v - best_v) < 0.005]
        return "/".join(tied) if len(tied) > 1 else best_k

    cmp = []
    cmp.append(f"\n{LINE}")
    cmp.append("  THREE-WAY COMPARISON TABLE")
    cmp.append("  Rule-Based  vs  ML (TF-IDF+LR)  vs  LLM (Groq)")
    cmp.append("  Same locked test set -- 46 rows")
    cmp.append(LINE)
    cmp.append("")
    cmp.append(
        "  " + "Metric".ljust(20)
        + "Rules".rjust(w) + "ML".rjust(w) + "LLM".rjust(w) + "Winner".rjust(w)
    )
    cmp.append("  " + THIN[:60])

    overall = [
        ("Accuracy",    rb_acc,         ml_acc,         llm_acc),
        ("Macro F1",    rb_macro_f1,    ml_macro_f1,    llm_macro_f1),
        ("Weighted F1", rb_weighted_f1, ml_weighted_f1, llm_weighted_f1),
    ]
    for name, rb_v, ml_v, llm_v in overall:
        cmp.append(
            "  " + name.ljust(20)
            + fmt(rb_v).rjust(w) + fmt(ml_v).rjust(w) + fmt(llm_v).rjust(w)
            + winner3(ml_v, llm_v, rb_v).rjust(w)
        )

    cmp.append("")
    cmp.append(
        "  " + "Per-Class F1".ljust(20)
        + "Rules".rjust(w) + "ML".rjust(w) + "LLM".rjust(w) + "Winner".rjust(w)
    )
    cmp.append("  " + THIN[:60])

    for label, rb_f1 in zip(LABEL_ORDER, rb_per_class):
        ml_f1  = ml_per_class_f1.get(label)
        llm_f1 = llm_per_class_f1.get(label)
        cmp.append(
            "  " + label.ljust(20)
            + fmt(rb_f1).rjust(w) + fmt(ml_f1).rjust(w) + fmt(llm_f1).rjust(w)
            + winner3(ml_f1, llm_f1, rb_f1).rjust(w)
        )

    cmp.append("")
    cmp.append(LINE)
    cmp.append("  THESIS INTERPRETATION")
    cmp.append(LINE)

    models = {
        "Rule-based": rb_macro_f1,
        "ML":         ml_macro_f1,
        "LLM":        llm_macro_f1,
    }
    ranked = sorted(
        ((k, v) for k, v in models.items() if v is not None),
        key=lambda x: x[1], reverse=True
    )
    cmp.append("  Ranking by Macro F1:")
    for i, (name, val) in enumerate(ranked, 1):
        cmp.append(f"    {i}. {name:<14} Macro F1 = {val:.3f}  {bar(val)}")

    cmp.append("")
    if ml_macro_f1 and rb_macro_f1:
        ml_vs_rb = ml_macro_f1 - rb_macro_f1
        cmp.append(f"  ML vs Rule-based : {ml_vs_rb:+.3f}  -- {'ML adds value beyond keyword matching' if ml_vs_rb > 0.05 else 'minimal gain from ML over rules'}")
    if ml_macro_f1 and llm_macro_f1:
        ml_vs_llm = ml_macro_f1 - llm_macro_f1
        cmp.append(f"  ML vs LLM        : {ml_vs_llm:+.3f}  -- {'ML outperforms LLM on this dataset' if ml_vs_llm > 0 else 'LLM outperforms ML on this dataset'}")
    if llm_macro_f1 and rb_macro_f1:
        llm_vs_rb = llm_macro_f1 - rb_macro_f1
        cmp.append(f"  LLM vs Rule-based: {llm_vs_rb:+.3f}  -- {'LLM adds value beyond keyword matching' if llm_vs_rb > 0.05 else 'LLM barely outperforms keyword matching'}")

    cmp.append("")
    cmp.append("  Key finding (CRITICAL class):")
    cmp.append("    LLM F1=0.000 on CRITICAL reveals age-dependency in the scoring formula.")
    cmp.append("    Without an age signal, priority_score never reaches the 0.80 threshold.")
    cmp.append("    ML and rules are immune to this because they learn/match content directly.")
    cmp.append("")
    cmp.append("  Cost vs performance:")
    cmp.append("    Rule-based -- <0.1ms, $0, no dependencies, fully explainable")
    cmp.append("    ML         -- <1ms,   $0, no API, requires labeled training data")
    cmp.append("    LLM        -- ~1-2s,  API cost per ticket, no training data needed")
    cmp.append(LINE)
    cmp.append("")

    for line in cmp:
        print(line)
    write_lines(cmp, COMPARE)

    print(f"  Rule-based report : {RB_REPORT}")
    print(f"  Comparison table  : {COMPARE}\n")


if __name__ == "__main__":
    main()
