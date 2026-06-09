"""
PHASE 1 — Independent Verification + Phase 3 Station Number + Phase 4 Model Selection
Phase 5 — Data Quality Investigation

Verifies ALL red team claims and runs all model experiments.
Output is captured for FINAL_IMPLEMENTATION_REPORT.md
"""

import os, sys, time, warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import (
    RandomForestRegressor, ExtraTreesRegressor, HistGradientBoostingRegressor
)
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from sklearn.inspection import permutation_importance

warnings.filterwarnings("ignore")

# Force UTF-8 output
sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET   = os.path.join(BASE_DIR, "dataset", "subway_congestion.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
SEP = "=" * 72

def section(title):
    print(f"\n{SEP}\n  {title}\n{SEP}")

def fmt(r2, mae, rmse=""):
    rmse_str = f"  RMSE={rmse:.4f}" if rmse != "" else ""
    return f"R2={r2:.4f}  MAE={mae:.4f}{rmse_str}"

# ════════════════════════════════════════════════════════════════════════
# DATA PREP — shared across all experiments
# ════════════════════════════════════════════════════════════════════════

section("LOADING AND PREPROCESSING DATASET")
df = pd.read_csv(DATASET)
print(f"Raw shape: {df.shape}")
print(f"Unique stations: {df['출발역'].nunique()}")
print(f"Unique lines: {sorted(df['호선'].unique())}")
print(f"Station number (역번호) range: {df['역번호'].min()} – {df['역번호'].max()}")

time_columns = [
    '5시30분','6시00분','6시30분','7시00분','7시30분','8시00분','8시30분',
    '9시00분','9시30분','10시00분','10시30분','11시00분','11시30분','12시00분',
    '12시30분','13시00분','13시30분','14시00분','14시30분','15시00분',
    '15시30분','16시00분','16시30분','17시00분','17시30분','18시00분',
    '18시30분','19시00분','19시30분','20시00분','20시30분','21시00분',
    '21시30분','22시00분','22시30분','23시00분','23시30분','00시00분','00시30분'
]

long_df = df.melt(
    id_vars=['요일구분','호선','역번호','출발역','상하구분'],
    value_vars=time_columns,
    var_name='시간',
    value_name='혼잡도'
)
print(f"Long-format shape: {long_df.shape}")

# Feature engineering (exact match to train_model.py)
long_df['Hour'] = long_df['시간'].apply(
    lambda x: int(x.split('시')[0]) + (0.5 if '30분' in x else 0.0)
)
day_type_map = {'평일': 0, '토요일': 1, '일요일': 2}
long_df['DayType'] = long_df['요일구분'].map(day_type_map)
long_df['HourSin'] = np.sin(2 * np.pi * long_df['Hour'] / 24.0)
long_df['HourCos'] = np.cos(2 * np.pi * long_df['Hour'] / 24.0)

line_enc      = LabelEncoder().fit(long_df['호선'])
station_enc   = LabelEncoder().fit(long_df['출발역'])
direction_enc = LabelEncoder().fit(long_df['상하구분'])

long_df['Line_enc']      = line_enc.transform(long_df['호선'])
long_df['Station_enc']   = station_enc.transform(long_df['출발역'])
long_df['Direction_enc'] = direction_enc.transform(long_df['상하구분'])

# Station Number feature (역번호)
long_df['StationNumber'] = long_df['역번호']

# Groups for split
groups = long_df['출발역'] + "_" + long_df['상하구분']
print(f"Unique groups (station+direction): {groups.nunique()}")

BASE_FEATS = ['Hour','DayType','HourSin','HourCos','Line_enc','Station_enc','Direction_enc']
FULL_FEATS = BASE_FEATS + ['StationNumber']

X_base = long_df[BASE_FEATS]
X_full = long_df[FULL_FEATS]
y      = long_df['혼잡도']

# Canonical GroupShuffleSplit (same as train_model.py: random_state=42)
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
tr_idx, te_idx = next(gss.split(X_base, y, groups=groups))

# Verify zero overlap
g_tr = set(groups.iloc[tr_idx].unique())
g_te = set(groups.iloc[te_idx].unique())
assert len(g_tr & g_te) == 0, "GROUP OVERLAP DETECTED"
print(f"\nGroupShuffleSplit: train={len(tr_idx)}, test={len(te_idx)}, groups_train={len(g_tr)}, groups_test={len(g_te)}, overlap=0")

Xb_tr, Xb_te = X_base.iloc[tr_idx], X_base.iloc[te_idx]
Xf_tr, Xf_te = X_full.iloc[tr_idx], X_full.iloc[te_idx]
y_tr, y_te   = y.iloc[tr_idx], y.iloc[te_idx]

# ════════════════════════════════════════════════════════════════════════
# CLAIM A — Verify R2=0.2727 on production model config
# ════════════════════════════════════════════════════════════════════════
section("CLAIM A — Reproducing R2=0.2727 (Production RF, Grouped Split)")

rf_prod = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1)
rf_prod.fit(Xb_tr, y_tr)
p_a = rf_prod.predict(Xb_te)
r2_a   = r2_score(y_te, p_a)
mae_a  = mean_absolute_error(y_te, p_a)
rmse_a = np.sqrt(mean_squared_error(y_te, p_a))

print(f"Reported: R2=0.2727  MAE=12.3242")
print(f"Observed: {fmt(r2_a, mae_a, rmse_a)}")
print(f"Match: {'YES' if abs(r2_a - 0.2727) < 0.005 else 'NO — MISMATCH'}")

# Also verify production model on disk
prod_model = joblib.load(os.path.join(MODEL_DIR, "queue_prediction_model.pkl"))
if prod_model.n_features_in_ == 8:
    print("\nNote: Disk model is the upgraded 8-feature model (includes StationNumber).")
    Xf_te_prod = Xf_te.copy()
    Xf_te_prod.columns = ['Hour','DayType','HourSin','HourCos','호선_encoded','출발역_encoded','상하구분_encoded','StationNumber']
    p_disk = prod_model.predict(Xf_te_prod)
    r2_disk  = r2_score(y_te, p_disk)
    mae_disk = mean_absolute_error(y_te, p_disk)
    print(f"Disk model: {fmt(r2_disk, mae_disk)}")
else:
    # Rename columns to match production model (it was trained with these names)
    prod_cols = ['Hour','DayType','HourSin','HourCos','호선_encoded','출발역_encoded','상하구분_encoded']
    Xb_te_prod = Xb_te.copy()
    Xb_te_prod.columns = prod_cols
    p_disk = prod_model.predict(Xb_te_prod)
    r2_disk  = r2_score(y_te, p_disk)
    mae_disk = mean_absolute_error(y_te, p_disk)
    print(f"\nDisk model: {fmt(r2_disk, mae_disk)}")
    print(f"Disk model match: {'YES' if abs(r2_disk - r2_a) < 0.001 else 'NO — DISK DIFFERS'}")

# ════════════════════════════════════════════════════════════════════════
# CLAIM B — 5-Fold GroupKFold
# ════════════════════════════════════════════════════════════════════════
section("CLAIM B — 5-Fold GroupKFold Cross Validation")

gkf = GroupKFold(n_splits=5)
r2_cv, mae_cv, rmse_cv = [], [], []

for fold, (tr_i, te_i) in enumerate(gkf.split(X_base, y, groups=groups)):
    g_tr_f = set(groups.iloc[tr_i].unique())
    g_te_f = set(groups.iloc[te_i].unique())
    assert len(g_tr_f & g_te_f) == 0, f"Fold {fold}: GROUP OVERLAP"
    
    rf_cv_ = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1)
    rf_cv_.fit(X_base.iloc[tr_i], y.iloc[tr_i])
    p_ = rf_cv_.predict(X_base.iloc[te_i])
    
    r2  = r2_score(y.iloc[te_i], p_)
    mae = mean_absolute_error(y.iloc[te_i], p_)
    rmse= np.sqrt(mean_squared_error(y.iloc[te_i], p_))
    r2_cv.append(r2); mae_cv.append(mae); rmse_cv.append(rmse)
    print(f"  Fold {fold+1}: {fmt(r2, mae, rmse)}  train={len(tr_i)}  test={len(te_i)}")

print(f"\n5-Fold Summary:")
print(f"  R2  : {np.mean(r2_cv):.4f} +/- {np.std(r2_cv):.4f}  (min={min(r2_cv):.4f}, max={max(r2_cv):.4f})")
print(f"  MAE : {np.mean(mae_cv):.4f} +/- {np.std(mae_cv):.4f}")
print(f"  RMSE: {np.mean(rmse_cv):.4f} +/- {np.std(rmse_cv):.4f}")
print(f"\nExpected: R2=0.28 +/- 0.05  | {'CONFIRMED' if abs(np.mean(r2_cv)-0.28) < 0.06 else 'DOES NOT MATCH'}")

# ════════════════════════════════════════════════════════════════════════
# PHASE 5 — Zero Congestion Data Quality Investigation
# ════════════════════════════════════════════════════════════════════════
section("PHASE 5 — DATA QUALITY: Zero Congestion Investigation")

zero_mask = long_df['혼잡도'] == 0
print(f"Zero congestion rows: {zero_mask.sum()} / {len(long_df)} ({100*zero_mask.mean():.2f}%)")
print(f"\nDistribution by hour (top 10):")
print(long_df[zero_mask]['Hour'].value_counts().head(10).to_string())
print(f"\nDistribution by line:")
print(long_df[zero_mask]['호선'].value_counts().to_string())
print(f"\nDistribution by station (top 10):")
print(long_df[zero_mask]['출발역'].value_counts().head(10).to_string())
print(f"\nHours 0.0 and 0.5 (midnight) zero rate:")
midnight = long_df[long_df['Hour'].isin([0.0, 0.5])]
print(f"  Total midnight rows: {len(midnight)}")
print(f"  Zero congestion at midnight: {(midnight['혼잡도']==0).sum()} ({100*(midnight['혼잡도']==0).mean():.1f}%)")
print(f"\nNon-midnight zero rate:")
nonmid = long_df[~long_df['Hour'].isin([0.0, 0.5])]
print(f"  Zero congestion outside midnight: {(nonmid['혼잡도']==0).sum()} ({100*(nonmid['혼잡도']==0).mean():.1f}%)")

# ════════════════════════════════════════════════════════════════════════
# PHASE 3 — Station Number Feature Investigation
# ════════════════════════════════════════════════════════════════════════
section("PHASE 3 — StationNumber (역번호) Feature Analysis")

# Is 역번호 unique per station?
sn_map = df.groupby('출발역')['역번호'].nunique()
multi_num = sn_map[sn_map > 1]
print(f"Stations with multiple 역번호 values: {len(multi_num)}")
if len(multi_num) > 0:
    print(multi_num.to_string())

# Is it line-specific?
sn_line = df.groupby(['호선','출발역'])['역번호'].first().reset_index()
print(f"\nSample station numbers by line:")
for line in sorted(df['호선'].unique()):
    sub = sn_line[sn_line['호선']==line][['출발역','역번호']].sort_values('역번호').head(5)
    print(f"  {line}: {list(zip(sub['출발역'].values, sub['역번호'].values))}")

# Correlation of 역번호 with 혼잡도
corr = long_df[['StationNumber','혼잡도']].corr()['혼잡도']['StationNumber']
print(f"\nCorrelation of StationNumber with congestion: {corr:.4f}")

# ── Experiment 1: Baseline RF (already done = r2_a, mae_a)
print(f"\nExperiment 1 — Baseline RF (7 features, grouped split):")
print(f"  {fmt(r2_a, mae_a, rmse_a)}")

# ── Experiment 2: RF + StationNumber
print(f"\nExperiment 2 — RF + StationNumber (8 features, grouped split):")
rf_sn = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1)
rf_sn.fit(Xf_tr, y_tr)
p_sn = rf_sn.predict(Xf_te)
r2_sn   = r2_score(y_te, p_sn)
mae_sn  = mean_absolute_error(y_te, p_sn)
rmse_sn = np.sqrt(mean_squared_error(y_te, p_sn))
print(f"  {fmt(r2_sn, mae_sn, rmse_sn)}")
print(f"  Delta R2 vs baseline: +{r2_sn - r2_a:.4f}")

# ── Experiment 3: RF + StationNumber + 5-Fold GroupKFold
print(f"\nExperiment 3 — RF + StationNumber (5-fold GroupKFold):")
r2_sn_cv, mae_sn_cv = [], []
for fold, (tr_i, te_i) in enumerate(gkf.split(X_full, y, groups=groups)):
    g_tr_f = set(groups.iloc[tr_i].unique())
    g_te_f = set(groups.iloc[te_i].unique())
    assert len(g_tr_f & g_te_f) == 0
    
    rf_ = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1)
    rf_.fit(X_full.iloc[tr_i], y.iloc[tr_i])
    p_ = rf_.predict(X_full.iloc[te_i])
    r2_sn_cv.append(r2_score(y.iloc[te_i], p_))
    mae_sn_cv.append(mean_absolute_error(y.iloc[te_i], p_))
    print(f"  Fold {fold+1}: {fmt(r2_sn_cv[-1], mae_sn_cv[-1])}")

print(f"  Mean: R2={np.mean(r2_sn_cv):.4f} +/- {np.std(r2_sn_cv):.4f}  MAE={np.mean(mae_sn_cv):.4f}")
print(f"  Improvement vs baseline: +{np.mean(r2_sn_cv)-np.mean(r2_cv):.4f}")

# ── Is StationNumber leakage?
# 역번호 is a static station identifier — it does NOT encode congestion directly
# and it exists in the training data at inference time (encoder maps station -> number)
# => NOT leakage, but is it just a proxy for Station_enc?
sn_station_corr = long_df[['StationNumber','Station_enc']].corr()['Station_enc']['StationNumber']
print(f"\nCorrelation of StationNumber with Station_enc (label): {sn_station_corr:.4f}")
print(f"Note: High correlation means StationNumber may be redundant with Station_enc")
print(f"LEAKAGE VERDICT: NOT data leakage (no future info). But may be near-redundant.")

# ── Experiment 4: HistGBM + StationNumber
print(f"\nExperiment 4 — HistGradientBoosting + StationNumber (grouped split):")
t0 = time.time()
hgb_sn = HistGradientBoostingRegressor(max_iter=300, max_depth=8, min_samples_leaf=20, random_state=42)
hgb_sn.fit(Xf_tr, y_tr)
p_hgb_sn = hgb_sn.predict(Xf_te)
t_hgb_sn = time.time() - t0
r2_hgb_sn   = r2_score(y_te, p_hgb_sn)
mae_hgb_sn  = mean_absolute_error(y_te, p_hgb_sn)
rmse_hgb_sn = np.sqrt(mean_squared_error(y_te, p_hgb_sn))
print(f"  {fmt(r2_hgb_sn, mae_hgb_sn, rmse_hgb_sn)}  time={t_hgb_sn:.1f}s")

# ════════════════════════════════════════════════════════════════════════
# PHASE 4 — Model Selection (CLAIM D)
# ════════════════════════════════════════════════════════════════════════
section("PHASE 4 — MODEL SELECTION (Claim D: HistGBM vs RF)")

models_to_test = {
    "RandomForest (current)": (RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1), BASE_FEATS),
    "ExtraTrees": (ExtraTreesRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1), BASE_FEATS),
    "HistGradientBoosting": (HistGradientBoostingRegressor(max_iter=300, max_depth=8, min_samples_leaf=20, random_state=42), BASE_FEATS),
    "HistGBM+StationNumber": (HistGradientBoostingRegressor(max_iter=300, max_depth=8, min_samples_leaf=20, random_state=42), FULL_FEATS),
    "RF+StationNumber": (RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, random_state=42, n_jobs=-1), FULL_FEATS),
}

# Try LightGBM
try:
    import lightgbm as lgb
    models_to_test["LightGBM"] = (lgb.LGBMRegressor(n_estimators=300, max_depth=8, num_leaves=63, min_child_samples=20, random_state=42, n_jobs=-1, verbose=-1), BASE_FEATS)
    models_to_test["LightGBM+SN"] = (lgb.LGBMRegressor(n_estimators=300, max_depth=8, num_leaves=63, min_child_samples=20, random_state=42, n_jobs=-1, verbose=-1), FULL_FEATS)
except ImportError:
    print("LightGBM: not installed")

# Try XGBoost
try:
    import xgboost as xgb
    models_to_test["XGBoost"] = (xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, min_child_weight=10, random_state=42, n_jobs=-1, verbosity=0), BASE_FEATS)
    models_to_test["XGBoost+SN"] = (xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, min_child_weight=10, random_state=42, n_jobs=-1, verbosity=0), FULL_FEATS)
except ImportError:
    print("XGBoost: not installed")

model_results = {}
print(f"\n{'Model':<30} {'R2':>8} {'MAE':>8} {'RMSE':>8} {'Time':>7} {'Size_MB':>8}")
print("-" * 75)

for name, (m, feats) in models_to_test.items():
    Xtr_m = long_df[feats].iloc[tr_idx]
    Xte_m = long_df[feats].iloc[te_idx]
    
    t0 = time.time()
    m.fit(Xtr_m, y_tr)
    train_t = time.time() - t0
    
    # Inference time
    t1 = time.time()
    preds = m.predict(Xte_m)
    infer_t = time.time() - t1
    
    r2   = r2_score(y_te, preds)
    mae  = mean_absolute_error(y_te, preds)
    rmse = np.sqrt(mean_squared_error(y_te, preds))
    
    # Model size
    import io, pickle
    buf = io.BytesIO()
    pickle.dump(m, buf)
    size_mb = buf.tell() / 1024 / 1024
    
    model_results[name] = {'r2': r2, 'mae': mae, 'rmse': rmse, 'train_t': train_t, 'infer_t': infer_t, 'size_mb': size_mb}
    print(f"{name:<30} {r2:>8.4f} {mae:>8.4f} {rmse:>8.4f} {train_t:>6.1f}s {size_mb:>7.1f}MB")

print(f"\nCurrent production RF R2 = {r2_a:.4f}")
best_name = max(model_results.items(), key=lambda x: x[1]['r2'])
print(f"Best model: {best_name[0]} with R2={best_name[1]['r2']:.4f}")
rf_r2 = model_results["RandomForest (current)"]["r2"]
best_r2 = best_name[1]["r2"]
pct_imp = 100 * (best_r2 - rf_r2) / max(abs(rf_r2), 1e-9)
print(f"Improvement over RF: +{pct_imp:.1f}%  (threshold for upgrade: >10%)")

# MODEL SELECTION DECISION
print(f"\nMODEL SELECTION DECISION:")
if best_r2 > rf_r2 * 1.10:
    print(f"  UPGRADE RECOMMENDED: {best_name[0]} improves R2 by {pct_imp:.1f}%")
    print(f"  New metrics: {fmt(best_r2, best_name[1]['mae'], best_name[1]['rmse'])}")
else:
    print(f"  KEEP RandomForest: best alternative only +{pct_imp:.1f}% (< 10% threshold)")

# ════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY TABLE
# ════════════════════════════════════════════════════════════════════════
section("FINAL SUMMARY")

print("Claim A (R2=0.2727):        CONFIRMED" if abs(r2_a - 0.2727) < 0.005 else "Claim A: MISMATCH")
print(f"Claim B (5-fold 0.28+-0.05): R2={np.mean(r2_cv):.4f}+-{np.std(r2_cv):.4f}")
print(f"Claim C (StationNumber +0.28): R2 increase = +{r2_sn - r2_a:.4f}  (was claimed +0.28)")
print(f"Claim D (HistGBM R2=0.42):  Observed R2={model_results.get('HistGradientBoosting',{}).get('r2',0):.4f}")

print(f"\nStationNumber decision:")
print(f"  Baseline 5-fold:          R2={np.mean(r2_cv):.4f}")
print(f"  +StationNumber 5-fold:    R2={np.mean(r2_sn_cv):.4f}")
print(f"  Corr with Station_enc:    {sn_station_corr:.4f}")
if np.mean(r2_sn_cv) - np.mean(r2_cv) > 0.05:
    print(f"  VERDICT: ADD StationNumber (genuine +{np.mean(r2_sn_cv)-np.mean(r2_cv):.4f})")
else:
    print(f"  VERDICT: SKIP (marginal gain or redundancy)")
