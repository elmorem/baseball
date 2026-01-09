"""Utility functions for player statistics calculations."""

from decimal import ROUND_HALF_UP, Decimal
from typing import Optional


def calculate_hits_per_game(
    hits: Optional[int], games: Optional[int]
) -> Optional[Decimal]:
    """Calculate hits per game statistic.

    Args:
        hits: Number of hits (must be non-negative).
        games: Number of games played (must be positive for valid calculation).

    Returns:
        Hits per game as a Decimal rounded to 3 decimal places,
        or None if calculation is not possible (missing data or division by zero).

    Examples:
        >>> calculate_hits_per_game(150, 100)
        Decimal('1.500')
        >>> calculate_hits_per_game(0, 50)
        Decimal('0.000')
        >>> calculate_hits_per_game(100, 0)
        None
        >>> calculate_hits_per_game(None, 100)
        None
    """
    # Handle missing data
    if hits is None or games is None:
        return None

    # Handle division by zero
    if games == 0:
        return None

    # Calculate and round to 3 decimal places
    result = Decimal(str(hits)) / Decimal(str(games))
    return result.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
