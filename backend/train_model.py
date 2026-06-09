"""
Training script for Smart Queue AI.

Final production model (v2):
  - Algorithm: HistGradientBoostingRegressor (scikit-learn built-in)
  - Features : 8 (Hour, DayType, HourSin, HourCos, Line, Station, Direction, StationNumber)
  - Split    : GroupShuffleSplit on station+direction (no leakage, GT-03)
  - Metrics  : R2≈0.63, MAE≈8.7 under grouped split (vs RF: R2=0.27, MAE=12.3)

Changes from v1 (Random Forest):
  - Switched to HistGradientBoostingRegressor (54MB→1MB, 130% R2 improvement)
  - Added StationNumber (역번호) feature: +34 R2 points in 5-fold GroupKFold
  - Permutation importance computed on 500-sample subsample for speed
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.inspection import permutation_importance

# Force UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Paths ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "subway_congestion.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

print("1. Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"   Loaded dataset with shape: {df.shape}")

# ── Wide to Long Transformation ───────────────────────────────────────
print("2. Reshaping dataset from wide to long format...")
time_columns = [
    '5시30분', '6시00분', '6시30분', '7시00분',
    '7시30분', '8시00분', '8시30분', '9시00분',
    '9시30분', '10시00분', '10시30분',
    '11시00분', '11시30분', '12시00분',
    '12시30분', '13시00분', '13시30분',
    '14시00분', '14시30분', '15시00분',
    '15시30분', '16시00분', '16시30분',
    '17시00분', '17시30분', '18시00분',
    '18시30분', '19시00분', '19시30분',
    '20시00분', '20시30분', '21시00분',
    '21시30분', '22시00분', '22시30분',
    '23시00분', '23시30분', '00시00분',
    '00시30분'
]

long_df = df.melt(
    id_vars=['요일구분', '호선', '역번호', '출발역', '상하구분'],
    value_vars=time_columns,
    var_name='시간',
    value_name='혼잡도'
)

# ── Feature Engineering ───────────────────────────────────────────────
print("3. Performing feature engineering...")

# Extract hour value as float with 30-minute granularity (GT-01)
long_df['Hour'] = long_df['시간'].apply(
    lambda x: int(x.split('시')[0]) + (0.5 if '30분' in x else 0.0)
)

# 3-way Day Type encoding: Weekday=0, Saturday=1, Sunday=2 (GT-07)
day_type_map = {'평일': 0, '토요일': 1, '일요일': 2}
long_df['DayType'] = long_df['요일구분'].map(day_type_map)

# Cyclic Hour encoding to resolve midnight discontinuity (GT-12)
long_df['HourSin'] = np.sin(2 * np.pi * long_df['Hour'] / 24.0)
long_df['HourCos'] = np.cos(2 * np.pi * long_df['Hour'] / 24.0)

# Station Number — geographic/topological feature (validated, not leakage)
long_df['StationNumber'] = long_df['역번호']

# Note: RushHour removed (empirically confirmed redundant, GT-06)

# ── Label Encoding ────────────────────────────────────────────────────
print("4. Encoding categorical fields...")
line_encoder = LabelEncoder()
station_encoder = LabelEncoder()
direction_encoder = LabelEncoder()

long_df['호선_encoded']    = line_encoder.fit_transform(long_df['호선'])
long_df['출발역_encoded']  = station_encoder.fit_transform(long_df['출발역'])
long_df['상하구분_encoded'] = direction_encoder.fit_transform(long_df['상하구분'])

joblib.dump(line_encoder,      os.path.join(MODEL_DIR, "line_encoder.pkl"))
joblib.dump(station_encoder,   os.path.join(MODEL_DIR, "station_encoder.pkl"))
joblib.dump(direction_encoder, os.path.join(MODEL_DIR, "direction_encoder.pkl"))
print("   Saved line, station, and direction encoders.")

# ── Train/Test Split (GroupShuffleSplit to prevent leakage) ───────────
features = [
    'Hour', 'DayType', 'HourSin', 'HourCos',
    '호선_encoded', '출발역_encoded', '상하구분_encoded',
    'StationNumber'
]
X = long_df[features]
y = long_df['혼잡도']

# Group by station + direction to prevent spatial/temporal leakage (GT-03)
groups = long_df['출발역'] + "_" + long_df['상하구분']

print("5. Splitting data using GroupShuffleSplit (no train/test leakage)...")
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

print(f"   Training samples: {len(X_train)}")
print(f"   Testing samples:  {len(X_test)}")

# Verify zero group overlap
groups_train = set(groups.iloc[train_idx].unique())
groups_test  = set(groups.iloc[test_idx].unique())
assert len(groups_train & groups_test) == 0, "GROUP OVERLAP DETECTED — ABORT"
print(f"   Group overlap: 0 (verified)")

# ── Model Training (HistGradientBoostingRegressor) ────────────────────
print("6. Training HistGradientBoostingRegressor (upgraded from RF v1)...")
print("   max_iter=300, max_depth=8, min_samples_leaf=20")
model = HistGradientBoostingRegressor(
    max_iter=300,
    max_depth=8,
    min_samples_leaf=20,
    random_state=42,
)
model.fit(X_train, y_train)
print("   Model training complete.")

# ── Save Model ────────────────────────────────────────────────────────
model_path = os.path.join(MODEL_DIR, "queue_prediction_model.pkl")
joblib.dump(model, model_path)
model_size_mb = os.path.getsize(model_path) / 1024 / 1024
print(f"   Saved model to: {model_path}  ({model_size_mb:.1f} MB)")

# ── Evaluation ────────────────────────────────────────────────────────
print("7. Evaluating model on test split...")
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
r2  = r2_score(y_test, predictions)
print(f"   Mean Absolute Error (MAE): {mae:.4f}")
print(f"   R2 Score (Variance Expl.): {r2:.4f}")
print(f"   Previous RF: R2=0.2727, MAE=12.3242 — improvement: +{r2-0.2727:.4f} R2")

# ── Permutation Feature Importance ───────────────────────────────────
print("8. Computing Permutation Feature Importance (GT-09)...")
# Subsample test set for permutation importance speed (HistGBM is faster)
n_perm = min(2000, len(X_test))
perm_idx = np.random.default_rng(42).choice(len(X_test), n_perm, replace=False)
p_imp = permutation_importance(
    model,
    X_test.iloc[perm_idx],
    y_test.iloc[perm_idx],
    n_repeats=5,
    random_state=42,
    n_jobs=-1,
)
joblib.dump(p_imp, os.path.join(MODEL_DIR, "permutation_importance.pkl"))

print("   Feature importances (permutation, descending):")
feat_imp = sorted(zip(features, p_imp.importances_mean), key=lambda x: -x[1])
for fname, imp in feat_imp:
    print(f"     {fname:<22}: {imp:.4f}")

print("\nTraining workflow complete (v2 — HistGradientBoosting + StationNumber)!")
