"""
Training Data Augmentation — Kaggle Dataset Merge
===================================================
Merges your synthetic gold training set (train.csv) with tickets from the
publicly available Kaggle customer support dataset (suraj520, 2023).

The locked test set (test.csv) is NEVER touched.
Only training data is augmented.

Steps:
  1. Download the Kaggle dataset CSV from:
     https://www.kaggle.com/datasets/suraj520/customer-support-ticket-dataset
  2. Place the CSV in the prisma/ folder (any filename — this script finds it)
  3. Run:  python prisma/augment_training_data.py
  4. Output: prisma/train_augmented.csv
  5. Then retrain: python prisma/train_classifier.py --train train_augmented.csv

Your original train.csv is NOT overwritten.
"""

import sys
from pathlib import Path

import pandas as pd

# ── Paths ────────────────────────────────────────────────────────────────────
BASE        = Path(__file__).parent
TRAIN       = BASE / "train.csv"
OUTPUT      = BASE / "train_augmented.csv"

LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# How many Kaggle tickets to add per class (keeps balance reasonable)
KAGGLE_PER_CLASS = 150

LINE = "=" * 60
THIN = "-" * 60


# ── Find the Kaggle CSV ───────────────────────────────────────────────────────
def find_kaggle_csv() -> Path:
    candidates = [
        p for p in BASE.glob("*.csv")
        if p.name not in ("train.csv", "test.csv", "gold_candidates.csv",
                          "train_augmented.csv")
    ]
    if not candidates:
        print("\nERROR: No Kaggle CSV found in the prisma/ folder.")
        print("  Download from:")
        print("  https://www.kaggle.com/datasets/suraj520/customer-support-ticket-dataset")
        print("  Place the CSV file in:")
        print(f"  {BASE}")
        sys.exit(1)
    if len(candidates) > 1:
        print(f"\nFound multiple CSVs: {[c.name for c in candidates]}")
        print("  Using the most recently modified one.")
        candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


# ── Detect and map Kaggle columns ─────────────────────────────────────────────
def load_kaggle(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8")
    df.columns = df.columns.str.strip()

    print(f"\n  Kaggle file  : {path.name}")
    print(f"  Raw columns  : {list(df.columns)}")
    print(f"  Raw rows     : {len(df)}")

    # Map whichever column names the file uses
    col_map: dict[str, str] = {}

    # Title / subject
    for c in df.columns:
        cl = c.lower().replace(" ", "_")
        if "subject" in cl or "title" in cl or "summary" in cl:
            col_map["title"] = c
            break

    # Description / body
    for c in df.columns:
        cl = c.lower().replace(" ", "_")
        if "description" in cl or "body" in cl or "content" in cl or "detail" in cl:
            col_map["description"] = c
            break

    # Priority / label
    for c in df.columns:
        cl = c.lower().replace(" ", "_")
        if "priority" in cl or "label" in cl or "urgency" in cl or "severity" in cl:
            col_map["priority"] = c
            break

    missing = [k for k in ("title", "description", "priority") if k not in col_map]
    if missing:
        print(f"\n  ERROR: Could not find columns for: {missing}")
        print("  Columns present:", list(df.columns))
        print("  Edit the col_map in augment_training_data.py to match manually.")
        sys.exit(1)

    print(f"  Mapped title       -> '{col_map['title']}'")
    print(f"  Mapped description -> '{col_map['description']}'")
    print(f"  Mapped priority    -> '{col_map['priority']}'")

    # Build clean frame
    clean = pd.DataFrame()
    clean["title"]       = df[col_map["title"]].fillna("").str.strip()
    clean["description"] = df[col_map["description"]].fillna("").str.strip()
    clean["human_label"] = (
        df[col_map["priority"]]
        .fillna("")
        .str.strip()
        .str.upper()
    )

    # Normalize label values
    label_aliases = {
        "CRITICAL": "CRITICAL",
        "URGENT":   "CRITICAL",
        "HIGH":     "HIGH",
        "MEDIUM":   "MEDIUM",
        "MODERATE": "MEDIUM",
        "NORMAL":   "MEDIUM",
        "LOW":      "LOW",
        "MINOR":    "LOW",
        "TRIVIAL":  "LOW",
    }
    clean["human_label"] = clean["human_label"].map(label_aliases)
    clean = clean[clean["human_label"].isin(LABEL_ORDER)].copy()
    clean = clean[clean["description"].str.len() > 10].copy()

    return clean


# ── Stratified sample from Kaggle ─────────────────────────────────────────────
def stratified_sample(df: pd.DataFrame, per_class: int, seed: int = 42) -> pd.DataFrame:
    parts = []
    for label in LABEL_ORDER:
        subset = df[df["human_label"] == label]
        n = min(len(subset), per_class)
        if n > 0:
            parts.append(subset.sample(n, random_state=seed))
    return pd.concat(parts, ignore_index=True)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{LINE}")
    print("  Training Data Augmentation")
    print(f"  Adding Kaggle tickets to train.csv")
    print(LINE)

    # Load existing training set
    train_df = pd.read_csv(TRAIN, encoding="utf-8")
    train_df.columns = train_df.columns.str.strip().str.lower()
    print(f"\n  Existing train.csv : {len(train_df)} rows")

    # Load Kaggle data
    kaggle_path = find_kaggle_csv()
    kaggle_raw  = load_kaggle(kaggle_path)

    # Sample
    kaggle_sample = stratified_sample(kaggle_raw, KAGGLE_PER_CLASS)

    # Build Kaggle rows in the same schema as train.csv.
    # train.csv ids are a sampled subset of gold_candidates.csv (1..226), not
    # a contiguous 1..len(train_df) range, so new ids must continue past the
    # existing max id to avoid collisions.
    next_id = int(pd.to_numeric(train_df["id"], errors="coerce").max()) + 1
    kaggle_rows = pd.DataFrame({
        "id":              range(next_id, next_id + len(kaggle_sample)),
        "title":           kaggle_sample["title"].values,
        "description":     kaggle_sample["description"].values,
        "source":          "kaggle",
        "suggested_label": kaggle_sample["human_label"].values,
        "human_label":     kaggle_sample["human_label"].values,
        "notes":           "",
    })

    # Merge and shuffle
    combined = pd.concat([train_df, kaggle_rows], ignore_index=True)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    combined.to_csv(OUTPUT, index=False, encoding="utf-8")

    # Summary
    print(f"\n{LINE}")
    print("  SUMMARY")
    print(LINE)

    print(f"\n  Original train.csv")
    orig_counts = train_df["human_label"].str.upper().value_counts()
    for label in LABEL_ORDER:
        print(f"    {label:<12} {orig_counts.get(label, 0)}")
    print(f"    {'TOTAL':<12} {len(train_df)}")

    print(f"\n  Kaggle tickets added")
    kag_counts = kaggle_rows["human_label"].value_counts()
    for label in LABEL_ORDER:
        print(f"    {label:<12} {kag_counts.get(label, 0)}")
    print(f"    {'TOTAL':<12} {len(kaggle_rows)}")

    print(f"\n  Combined train_augmented.csv")
    comb_counts = combined["human_label"].str.upper().value_counts()
    for label in LABEL_ORDER:
        print(f"    {label:<12} {comb_counts.get(label, 0)}")
    print(f"    {'TOTAL':<12} {len(combined)}")

    print(f"\n  Written to: {OUTPUT}")
    print(f"\n{LINE}")
    print("  NEXT STEP")
    print(LINE)
    print("  Retrain the classifier on augmented data:")
    print("  python prisma/train_classifier.py --train train_augmented.csv")
    print(LINE + "\n")


if __name__ == "__main__":
    main()
