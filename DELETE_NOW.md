# Smart Queue AI — Safe Deletion List

This document lists files in the repository that are either unused, obsolete, or research-only, along with their safe deletion/retention status for the final submission.

| File | Purpose | Referenced? | Production Impact | Safe To Delete? | Recommendation |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `frontend/components/congestion-card.tsx` | Legacy component to show predicted congestion cards | **NO** | None (unused) | **YES** | **DELETE** |
| `frontend/components/station-table.tsx` | Legacy component to show recommendations table | **NO** | None (unused) | **YES** | **DELETE** |
| `backend/phase1_experiments.py` | Research scripts demonstrating baseline claims | **NO** | None (reproducibility only) | **YES** | **KEEP / ARCHIVE** (Save for review) |
| `backend/red_team_validation.py` | Independent Red Team claim validation code | **NO** | None (reproducibility only) | **YES** | **KEEP / ARCHIVE** (Save for review) |
| `backend/retrain_and_compare.py` | Baseline comparison and training validation script | **NO** | None (reproducibility only) | **YES** | **KEEP / ARCHIVE** (Save for review) |
| `backend/verify_fixes.py` | Automated local test script for backend integrity | **NO** | None (test execution only) | **YES** | **KEEP / ARCHIVE** (Save for review) |
| `backend/notebooks/.ipynb_checkpoints/` | Auto-generated Jupyter Notebook checkpoint directory | **NO** | None | **YES** | **DELETE** |
