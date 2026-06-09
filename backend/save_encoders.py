"""
One-time script to save LabelEncoders from the dataset.

The notebook fitted encoders during preprocessing but never persisted them.
This script re-fits the same encoders on the same data and saves them
so that prediction_service.py can load them without re-processing.

Run once:  python save_encoders.py
"""

import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder

# ── Load dataset (same path as notebook) ──────────────────────────────
df = pd.read_csv("dataset/subway_congestion.csv")

# ── Time columns (identical to notebook Cell 3) ──────────────────────
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

# ── Wide → long (identical to notebook Cell 3) ────────────────────────
long_df = df.melt(
    id_vars=['요일구분', '호선', '역번호', '출발역', '상하구분'],
    value_vars=time_columns,
    var_name='시간',
    value_name='혼잡도'
)

# ── Fit encoders (identical to notebook Cell 12) ─────────────────────
line_encoder = LabelEncoder()
station_encoder = LabelEncoder()
direction_encoder = LabelEncoder()

line_encoder.fit(long_df['호선'])
station_encoder.fit(long_df['출발역'])
direction_encoder.fit(long_df['상하구분'])

# ── Persist ──────────────────────────────────────────────────────────
joblib.dump(line_encoder, "models/line_encoder.pkl")
joblib.dump(station_encoder, "models/station_encoder.pkl")
joblib.dump(direction_encoder, "models/direction_encoder.pkl")

print("Encoders saved successfully:")
print(f"  Lines   : {list(line_encoder.classes_)}")
print(f"  Stations: {len(station_encoder.classes_)} unique stations")
print(f"  Directions: {list(direction_encoder.classes_)}")
