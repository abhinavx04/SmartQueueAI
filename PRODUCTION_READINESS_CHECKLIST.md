# Smart Queue AI — Production Readiness Checklist

This document verifies the production readiness of Smart Queue AI after implementing remediation fixes for all audit findings (Ground Truth, Remediation Audit, and Independent Red Team Review).

---

## 🛡️ Security Hardening

- [x] **No Hardcoded Credentials (GT-04)**
  - All database connection secrets are removed from the source code.
  - Configuration uses `load_dotenv()` to read database variables from `backend/.env` (which is excluded from Git tracking via `.gitignore`).
- [x] **No Exception Leakage (NM-08 / FIX-05)**
  - Global exception handler in `backend/app.py` catches all unhandled exceptions, logs them with stack traces server-side, and returns a standardized response to the client:
    ```json
    { "detail": "Internal Server Error" }
    ```
- [x] **No Wildcard CORS (GT-04 / FIX-06)**
  - Replaced wildcard CORS origins `allow_origins=["*"]` with an environment-based config `ALLOWED_ORIGINS`.
  - Defaults to local Next.js dev server origins in development: `http://localhost:3000,http://localhost:3001`.
  - Whitelists only specific frontend domains in production via environment configuration.
- [x] **Database Safety**
  - Parameterized queries are used for all database inserts and updates, preventing SQL injection vulnerabilities.

---

## 📊 ML Pipeline and Modeling Integrity

- [x] **No Train/Test Leakage (GT-03 / Claim A)**
  - Model splitting uses `GroupShuffleSplit` on `Station + Direction` grouping to prevent information leakage between train and test sets.
  - Verified 0 group overlap between training and testing splits.
- [x] **Proper Time Granularity (GT-01 / FIX-01)**
  - Extracted half-hour time slots as float values (e.g. `8.5`, `23.5`, `0.0`, `0.5`).
  - Restored 30-minute granularity and removed duplicate feature group collisions.
- [x] **Day Type Encoding (GT-07)**
  - Split day types into three categories: Weekday (`0`), Saturday (`1`), Sunday (`2`) instead of binary weekend flags, resolving prediction performance gaps.
- [x] **Cyclic Time Features (GT-12)**
  - Implemented `HourSin` and `HourCos` to resolve midnight discontinuity (e.g., matching the spatial distance between `23.5` and `0.0`).
- [x] **Model Size and Underfitting (GT-13 / Claim D)**
  - Upgraded model architecture to `HistGradientBoostingRegressor` (built-in scikit-learn).
  - Reduced model size from **54.6 MB** to **1.0 MB**, while dramatically improving performance.

---

## 🛠️ API & Schema Alignment

- [x] **No Schema Mismatch (FIX-01)**
  - Replaced `hour: int` with `hour: float` in `TrendItem` schema (`backend/schemas/analytics.py`).
- [x] **Dynamic Trend Generation (FIX-02)**
  - Replaced `range(24)` with dynamic slot generation of all 40 half-hour increments (`5.0`, `5.5`, ..., `23.5`, `0.0`, `0.5`) in `backend/services/analytics_service.py`.
- [x] **Database Type Alignments (GT-11)**
  - Migrated `hour_value` database column from `INT` to `FLOAT` and created standard database indexes at pool initialization to speed up analytics queries.

---

## 🚇 Recommendation Validation

- [x] **Line-Station Routing Restrictions (GT-02)**
  - Recommendations are strictly constrained to the same line as the request using `_LINE_STATIONS_MAP`.
- [x] **Geographic Station Feature Integration**
  - Look up station numbers (`StationNumber`) and feed them into the model to maintain the accuracy gains (+0.35 R²) without introducing data leakage.
- [x] **No Recommendation Self-Inclusion (FIX-03 / NM-05)**
  - The recommendation service rejects the user's current station (passed as `current_station` from frontend dropdowns) from alternative suggestions.

---

## 💻 Frontend Polish

- [x] **Dynamic Station Dropdowns (FIX-04 / NM-06)**
  - Frontend queries `GET /stations` to populate line-specific station lists dynamically rather than using a hardcoded list of 15 stations.
  - Automatically filters available stations when the user changes the subway line, avoiding invalid line-station selections.
- [x] **3-Way Day Selection**
  - Updated frontend forms to use the Weekday, Saturday, and Sunday 3-class day selector.
- [x] **30-Min Time Options**
  - Form selectors support half-hour selections (e.g. `08:30`) matching backend inputs.
