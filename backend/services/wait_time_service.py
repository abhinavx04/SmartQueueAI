"""
Heuristic Wait Time Estimation Service.

This service implements a heuristic wait-time approximation model. It translates
subway congestion levels (expressed as a percentage) into an estimated wait time index.
Note: This is a domain-specific heuristic and does NOT represent a formal queueing-theoretic
model (e.g., M/M/1), as queueing theory requires dynamic arrival and service rates
which are not present in this static congestion dataset.
"""


def estimate_wait_time(
    congestion: float,
    service_rate: float = 5.0,
) -> float:
    """
    Estimate the waiting time index using a non-linear heuristic.

    At low congestion, wait times are minimal. As congestion rises, wait times
    increase non-linearly to model platform and boarding delays.

    Parameters
    ----------
    congestion   : Predicted crowd level percentage (e.g. 35.0 for 35%).
    service_rate : Normal processing rate parameter (default 5.0).
                   NOTE: Previously named 'base_service_rate' — renamed to
                   match caller convention in wait_time.py router.

    Returns
    -------
    float – Estimated wait time in minutes, rounded to 2 decimals.
    """
    congestion_val = max(0.0, congestion)

    # Base heuristic: congestion / service_rate
    base_wait = congestion_val / service_rate

    # Non-linear scaling: as congestion exceeds 100% (overcapacity), wait times
    # scale up non-linearly to simulate platform congestion and delayed boarding.
    if congestion_val > 100.0:
        overcrowding_factor = 1.0 + 0.05 * ((congestion_val - 100.0) ** 1.5)
    else:
        overcrowding_factor = 1.0

    wait_time = base_wait * overcrowding_factor
    return round(wait_time, 2)
