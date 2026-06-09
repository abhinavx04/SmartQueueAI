"""Quick verification of all red-team fixes applied in this session."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

errors = []

# Test 1: service_rate parameter fix
from services.wait_time_service import estimate_wait_time
import inspect
params = list(inspect.signature(estimate_wait_time).parameters.keys())
if 'service_rate' not in params:
    errors.append("FAIL: service_rate not in wait_time params")
if 'base_service_rate' in params:
    errors.append("FAIL: old base_service_rate still present")
r1 = estimate_wait_time(50.0, service_rate=5.0)
r2 = estimate_wait_time(50.0, service_rate=10.0)
if r1 == r2:
    errors.append(f"FAIL: service_rate ignored (r1={r1}, r2={r2})")
else:
    print(f"PASS: service_rate fix: rate=5.0->{r1}min, rate=10.0->{r2}min (correctly different)")

# Test 2: TrendItem hour accepts float
from schemas.analytics import TrendItem
ti = TrendItem(hour=8.5, avg_wait_time=3.2)
if ti.hour != 8.5:
    errors.append(f"FAIL: TrendItem.hour got {ti.hour}")
else:
    print(f"PASS: TrendItem.hour=8.5 accepted correctly")

# Test 3: analytics_service uses 40 slots
from services.analytics_service import get_wait_time_trends
import types, ast, inspect
src = inspect.getsource(get_wait_time_trends)
if 'range(24)' in src:
    errors.append("FAIL: analytics_service still has old range(24) in get_wait_time_trends")
else:
    print("PASS: analytics_service no longer uses range(24) in trend function")

# Test 4: recommendation self-exclusion
from services.recommendation_service import recommend_less_crowded_stations
rec_params = list(inspect.signature(recommend_less_crowded_stations).parameters.keys())
if 'current_station' not in rec_params:
    errors.append("FAIL: current_station not in recommendation params")
else:
    print("PASS: recommendation_service has current_station exclusion parameter")

# Test 5: app.py no longer leaks str(exc)
app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
with open(app_path, 'r') as f:
    app_content = f.read()
if '"error": str(exc)' in app_content or "'error': str(exc)" in app_content:
    errors.append("FAIL: app.py still exposes str(exc)")
else:
    print("PASS: app.py no longer exposes str(exc) in 500 responses")

# Summary
print()
if errors:
    print(f"=== {len(errors)} FAILURES ===")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
else:
    print(f"=== ALL 5 RED-TEAM FIX VERIFICATIONS PASSED ===")
