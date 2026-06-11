# Model V2 — Expanded HIGH-priority dataset

- **Model type**: TF-IDF (1-2 gram) + Logistic Regression
- **TF-IDF params**: max_features=3000, min_df=2, max_df=0.95
- **Train accuracy**: 98.6%
- **Test accuracy**: 87.5%
- **Macro F1**: 0.873
- **Per-class F1**: LOW=0.893, MEDIUM=0.837, HIGH=0.875, CRITICAL=0.885
- **Training rows**: 419 (test: 104, locked)
- **Date frozen**: 2026-06-11
- **Status**: CURRENT BASELINE — supersedes Model V1

## What changed vs V1

Added 297 deduplicated human-labeled tickets (from `human_dataset_500.csv`,
covering Rwandan business systems with diverse writing styles) to
`gold_candidates.csv`, bringing the total from 226 → 523 rows. Re-ran
`gold:split` (new stratified 80/20 split, seed 42) and retrained.

## Comparison to V1

| Metric        | V1    | V2    |
|---------------|-------|-------|
| Train accuracy| 95.0% | 98.6% |
| Test accuracy | 76.1% | 87.5% |
| Macro F1      | 0.714 | 0.873 |
| HIGH F1       | 0.471 | 0.875 |

Both macro F1 and HIGH F1 improved substantially — V2 kept as the new
baseline. V1 artifacts (`classifier.pkl`, `train.csv`, `test.csv`) are
preserved in `prisma/model/backup_v1/` for rollback if needed.
