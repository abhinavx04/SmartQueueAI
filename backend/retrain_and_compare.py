import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import GroupShuffleSplit, GroupKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# Reconfigure output encoding to handle Korean characters in console
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "subway_congestion.csv")

print("1. Loading dataset...")
df = pd.read_csv(DATASET_PATH)

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

# Preprocessing
long_df['Hour'] = long_df['시간'].apply(
    lambda x: int(x.split('시')[0]) + (0.5 if '30분' in x else 0.0)
)

day_type_map = {'평일': 0, '토요일': 1, '일요일': 2}
long_df['DayType'] = long_df['요일구분'].map(day_type_map)

long_df['HourSin'] = np.sin(2 * np.pi * long_df['Hour'] / 24.0)
long_df['HourCos'] = np.cos(2 * np.pi * long_df['Hour'] / 24.0)

long_df['RushHour'] = long_df['Hour'].apply(
    lambda x: 1 if (7 <= x <= 9) or (17 <= x <= 19) else 0
)

# Encode categoricals
line_encoder = LabelEncoder()
station_encoder = LabelEncoder()
direction_encoder = LabelEncoder()

long_df['호선_encoded'] = line_encoder.fit_transform(long_df['호선'])
long_df['출발역_encoded'] = station_encoder.fit_transform(long_df['출발역'])
long_df['상하구분_encoded'] = direction_encoder.fit_transform(long_df['상하구분'])

long_df['GroupKey'] = long_df['출발역'] + "_" + long_df['상하구분']

# Baseline Prep
long_df['Hour_baseline'] = long_df['시간'].str.extract(r'(\d+)').astype(int)
long_df['IsWeekend_baseline'] = long_df['요일구분'].apply(lambda x: 1 if x != '평일' else 0)
long_df['RushHour_baseline'] = long_df['Hour_baseline'].apply(lambda x: 1 if (7 <= x <= 9) or (17 <= x <= 19) else 0)

X_baseline = long_df[['Hour_baseline', 'IsWeekend_baseline', 'RushHour_baseline', '호선_encoded', '출발역_encoded', '상하구분_encoded']]
y = long_df['혼잡도']

# Grouped Split generator
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(long_df, y, groups=long_df['GroupKey']))

# 1. Random Split Baseline
print("\n--- BASELINE EVALUATION (Original setup: random split, original features) ---")
from sklearn.model_selection import train_test_split
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_baseline, y, test_size=0.2, random_state=42)
rf_baseline = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
rf_baseline.fit(X_train_r, y_train_r)
preds_r = rf_baseline.predict(X_test_r)
print(f"Original setup (Random split, Integer Hour, 6 features):")
print(f"  Test R2: {r2_score(y_test_r, preds_r):.4f}")
print(f"  Test MAE: {mean_absolute_error(y_test_r, preds_r):.4f}")

# Get size
baseline_path = os.path.join(BASE_DIR, "models", "temp_baseline.pkl")
joblib.dump(rf_baseline, baseline_path)
baseline_size_mb = os.path.getsize(baseline_path) / (1024 * 1024)
print(f"  Baseline Model File Size: {baseline_size_mb:.2f} MB")
if os.path.exists(baseline_path):
    os.remove(baseline_path)

# 2. Leakage verification (Original features but grouped split)
X_train_g, X_test_g = X_baseline.iloc[train_idx], X_baseline.iloc[test_idx]
y_train_g, y_test_g = y.iloc[train_idx], y.iloc[test_idx]
rf_baseline_g = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
rf_baseline_g.fit(X_train_g, y_train_g)
preds_g = rf_baseline_g.predict(X_test_g)
print(f"Original features under GROUPED split (Leakage removed):")
print(f"  Test R2: {r2_score(y_test_g, preds_g):.4f}")
print(f"  Test MAE: {mean_absolute_error(y_test_g, preds_g):.4f}")

# 3. GT-06 Feature set comparisons under Grouped Split
print("\n--- GT-06: EMPIRICAL FEATURE SET COMPARISON (Grouped split, new preprocessing) ---")
feature_sets = {
    "Hour + Cyclic (No RushHour)": ['Hour', 'DayType', 'HourSin', 'HourCos', '호선_encoded', '출발역_encoded', '상하구분_encoded'],
    "RushHour only (No Hour/Cyclic)": ['RushHour', 'DayType', '호선_encoded', '출발역_encoded', '상하구분_encoded'],
    "Both (Hour + Cyclic + RushHour)": ['Hour', 'DayType', 'HourSin', 'HourCos', 'RushHour', '호선_encoded', '출발역_encoded', '상하구분_encoded']
}

for name, cols in feature_sets.items():
    X_f = long_df[cols]
    X_tr, X_te = X_f.iloc[train_idx], X_f.iloc[test_idx]
    
    rf = RandomForestRegressor(n_estimators=100, max_depth=20, min_samples_leaf=5, random_state=42, n_jobs=-1)
    rf.fit(X_tr, y_train_g)
    preds = rf.predict(X_te)
    
    print(f"Feature Set: {name}")
    print(f"  Test R2: {r2_score(y_test_g, preds):.4f}")
    print(f"  Test MAE: {mean_absolute_error(y_test_g, preds):.4f}")

# 4. GT-13 Regularization & size comparison
print("\n--- GT-13: MODEL REGULARIZATION & SIZE COMPARISON (Grouped split, 7 features) ---")
cols_new = ['Hour', 'DayType', 'HourSin', 'HourCos', '호선_encoded', '출발역_encoded', '상하구분_encoded']
X_new = long_df[cols_new]
X_tr, X_te = X_new.iloc[train_idx], X_new.iloc[test_idx]

reg_configs = {
    "Unregularized (max_depth=None, min_samples_leaf=1)": {"max_depth": None, "min_samples_leaf": 1},
    "Regularized (max_depth=20, min_samples_leaf=5)": {"max_depth": 20, "min_samples_leaf": 5},
    "Regularized (max_depth=15, min_samples_leaf=10)": {"max_depth": 15, "min_samples_leaf": 10}
}

for name, cfg in reg_configs.items():
    rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1, **cfg)
    rf.fit(X_tr, y_train_g)
    preds = rf.predict(X_te)
    
    tmp_filename = f"temp_{cfg['max_depth']}_{cfg['min_samples_leaf']}.pkl"
    tmp_path = os.path.join(BASE_DIR, "models", tmp_filename)
    joblib.dump(rf, tmp_path)
    file_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
        
    print(f"Config: {name}")
    print(f"  Test R2: {r2_score(y_test_g, preds):.4f}")
    print(f"  Test MAE: {mean_absolute_error(y_test_g, preds):.4f}")
    print(f"  Model Size: {file_size_mb:.2f} MB")
