"""
ML Classifier — Ticket Urgency Prediction
==========================================
Trains a TF-IDF + Logistic Regression classifier on train.csv,
evaluates it on the locked test.csv, and saves the trained model.

Usage:
    python prisma/train_classifier.py

Outputs:
    prisma/model/classifier.pkl   — trained model pipeline
    prisma/model/report.txt       — full evaluation report
"""

import argparse
import os
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.pipeline import Pipeline

warnings.filterwarnings("ignore")

# ── Args ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument(
    "--train",
    default="train.csv",
    help="Training CSV filename inside prisma/ (default: train.csv)"
)
args = parser.parse_args()

# ── Paths ────────────────────────────────────────────────────────────────────
BASE    = Path(__file__).parent
TRAIN   = BASE / args.train
TEST    = BASE / "test.csv"
MODEL_DIR = BASE / "model"
MODEL_FILE = MODEL_DIR / "classifier.pkl"
REPORT_FILE = MODEL_DIR / "report.txt"

LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
LINE  = "=" * 60
THIN  = "-" * 60


# ── Helpers ──────────────────────────────────────────────────────────────────
def load(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip().str.lower()
    df = df[df["human_label"].notna()].copy()
    df["human_label"] = df["human_label"].str.strip().str.upper()
    df = df[df["human_label"].isin(LABEL_ORDER)].copy()
    # Combine title + description into one text feature
    df["text"] = (
        df["title"].fillna("") + " " + df["description"].fillna("")
    ).str.strip()
    return df


def bar(value: float, width: int = 20) -> str:
    filled = round(value * width)
    return "#" * filled + "." * (width - filled)


def print_and_write(lines: list[str], file) -> None:
    for line in lines:
        print(line)
        file.write(line + "\n")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    MODEL_DIR.mkdir(exist_ok=True)

    # ── Load data ────────────────────────────────────────────────────────────
    train_df = load(TRAIN)
    test_df  = load(TEST)

    X_train, y_train = train_df["text"], train_df["human_label"]
    X_test,  y_test  = test_df["text"],  test_df["human_label"]

    # ── Build pipeline ───────────────────────────────────────────────────────
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 2),   # unigrams + bigrams
                max_features=3_000,
                sublinear_tf=True,    # log-normalise term frequency
                strip_accents="unicode",
                analyzer="word",
                token_pattern=r"\w{2,}",  # ignore single chars
                min_df=2,
                max_df=0.95,
            ),
        ),
        (
            "clf",
            LogisticRegression(
                C=1.0,
                max_iter=1000,
                class_weight="balanced",  # handles class imbalance
                solver="lbfgs",
                random_state=42,
            ),
        ),
    ])

    # ── Train ────────────────────────────────────────────────────────────────
    pipeline.fit(X_train, y_train)

    # ── Predict ──────────────────────────────────────────────────────────────
    y_pred       = pipeline.predict(X_test)
    y_pred_train = pipeline.predict(X_train)

    # ── Metrics ──────────────────────────────────────────────────────────────
    test_acc   = accuracy_score(y_test, y_pred)
    train_acc  = accuracy_score(y_train, y_pred_train)
    macro_f1   = f1_score(y_test, y_pred, average="macro",    labels=LABEL_ORDER)
    weighted_f1 = f1_score(y_test, y_pred, average="weighted", labels=LABEL_ORDER)
    cm         = confusion_matrix(y_test, y_pred, labels=LABEL_ORDER)
    cr         = classification_report(
        y_test, y_pred, labels=LABEL_ORDER, digits=3, zero_division=0
    )

    # ── Per-class F1 ─────────────────────────────────────────────────────────
    per_class_f1 = f1_score(
        y_test, y_pred, average=None, labels=LABEL_ORDER, zero_division=0
    )

    # ── Report ───────────────────────────────────────────────────────────────
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        out: list[str] = []

        out.append(f"\n{LINE}")
        out.append("  ML Classifier — Evaluation Report")
        out.append("  TF-IDF (1-2 gram) + Logistic Regression")
        out.append(LINE)
        out.append(f"  Train set : {len(X_train)} rows  ({args.train})")
        out.append(f"  Test set  : {len(X_test)} rows  (locked — test.csv)")
        tfidf = pipeline.named_steps["tfidf"]
        out.append(
            f"  Features  : TF-IDF, max {tfidf.max_features:,} terms, "
            f"min_df={tfidf.min_df}, max_df={tfidf.max_df}, sublinear_tf={tfidf.sublinear_tf}"
        )
        out.append(f"  Model     : LogisticRegression, C=1.0, balanced weights")
        out.append("")

        out.append("  Accuracy")
        out.append("  " + THIN.slice if False else "  " + THIN[:50])
        out.append(f"  Train accuracy : {train_acc:.3f}   (sanity check — not reported)")
        out.append(f"  Test  accuracy : {test_acc:.3f}")
        out.append("")

        out.append("  F1 Scores (test set)")
        out.append("  " + THIN[:50])
        out.append(f"  Macro F1    : {macro_f1:.3f}   {bar(macro_f1)}")
        out.append(f"  Weighted F1 : {weighted_f1:.3f}   {bar(weighted_f1)}")
        out.append("")

        out.append("  Per-Class F1")
        out.append("  " + THIN[:50])
        for label, f1 in zip(LABEL_ORDER, per_class_f1):
            support = int((y_test == label).sum())
            out.append(
                f"  {label:<10}  F1={f1:.3f}  {bar(f1)}  (n={support})"
            )
        out.append("")

        out.append("  Confusion Matrix")
        out.append("  " + THIN[:50])
        out.append("  Rows = actual label,  Cols = predicted label")
        out.append("")
        header = "  " + " " * 10 + "  ".join(f"{l:>8}" for l in LABEL_ORDER)
        out.append(header)
        for i, label in enumerate(LABEL_ORDER):
            row_str = "  " + f"{label:<10}" + "  ".join(
                f"{cm[i][j]:>8}" for j in range(len(LABEL_ORDER))
            )
            out.append(row_str)
        out.append("")

        out.append("  Full Classification Report")
        out.append("  " + THIN[:50])
        for line in cr.splitlines():
            out.append("  " + line)
        out.append("")

        out.append(LINE)
        out.append("  VERDICT")
        out.append(LINE)
        grade = (
            "EXCELLENT" if macro_f1 >= 0.80
            else "GOOD"    if macro_f1 >= 0.65
            else "FAIR"    if macro_f1 >= 0.50
            else "POOR"
        )
        out.append(f"  Macro F1 = {macro_f1:.3f}  [{grade}]")
        if macro_f1 >= 0.65:
            out.append("  [PASS]  Classifier is competitive -- include in thesis comparison.")
        else:
            out.append("  [WARN]  Low F1 -- review class balance or add more training data.")
        out.append(LINE)
        out.append("")

        print_and_write(out, f)

    # ── Save model ───────────────────────────────────────────────────────────
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"  Model saved  : {MODEL_FILE}")
    print(f"  Report saved : {REPORT_FILE}\n")


if __name__ == "__main__":
    main()
