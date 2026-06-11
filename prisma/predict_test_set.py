"""
Predict priority for every row in test.csv using the trained classifier.

Used by eval_spearman.ts to compute Spearman rank correlation between the
classifier's predicted priority ranking and the human-labeled ranking.

Outputs a JSON array on stdout:
  [{"id": 9, "predicted_label": "HIGH", "predicted_score": 2.73}, ...]

predicted_score = expected ordinal value under the model's class
probabilities (LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4), used as a continuous
ranking signal that breaks ties between tickets predicted into the same
class.
"""

import json
import pickle
from pathlib import Path

import pandas as pd

BASE = Path(__file__).parent
MODEL_FILE = BASE / "model" / "classifier.pkl"
TEST_FILE = BASE / "test.csv"

LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
ORDINAL = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def main():
    with open(MODEL_FILE, "rb") as f:
        model = pickle.load(f)

    df = pd.read_csv(TEST_FILE)
    df.columns = df.columns.str.strip().str.lower()

    texts = (df["title"].fillna("") + " " + df["description"].fillna("")).tolist()
    proba = model.predict_proba(texts)
    classes = list(model.classes_)

    results = []
    for i, row in df.iterrows():
        probs = proba[i]
        best_idx = int(probs.argmax())
        predicted_label = str(classes[best_idx])
        predicted_score = sum(
            float(probs[j]) * ORDINAL.get(str(classes[j]), 0)
            for j in range(len(classes))
        )
        results.append(
            {
                "id": int(row["id"]),
                "predicted_label": predicted_label,
                "predicted_score": predicted_score,
            }
        )

    print(json.dumps(results))


if __name__ == "__main__":
    main()
