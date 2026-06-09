"""
Wait time estimation service.

Estimates queue waiting time from a predicted congestion value
using the simple queue formula from notebook Cell 42.
"""


def estimate_wait_time(
    congestion: float,
    service_rate: float = 5,
) -> float:
    """
    Estimate waiting time based on congestion.

    Parameters
    ----------
    congestion   : Predicted crowd level (from predict_congestion).
    service_rate : Number of people processed per minute.
                   Default is 5 (same as notebook).

    Returns
    -------
    float – Estimated wait time in minutes, rounded to 2 decimals.
    """
    wait_time = congestion / service_rate
    return round(wait_time, 2)
