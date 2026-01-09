#!/usr/bin/env python3
"""Backfill hits_per_game for existing players.

This script finds all players with NULL hits_per_game values and calculates
the value based on their hits and games statistics.

Usage:
    # From the backend directory:
    python scripts/backfill_hits_per_game.py

    # Dry run (preview changes without applying):
    python scripts/backfill_hits_per_game.py --dry-run

    # Verbose output:
    python scripts/backfill_hits_per_game.py --verbose
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path so we can import app modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.player import Player
from app.players.utils import calculate_hits_per_game


async def get_players_needing_backfill(db: AsyncSession) -> list[Player]:
    """Get all players with NULL hits_per_game."""
    query = select(Player).where(Player.hits_per_game.is_(None))
    result = await db.execute(query)
    return list(result.scalars().all())


async def backfill_player(
    db: AsyncSession, player: Player, dry_run: bool = False, verbose: bool = False
) -> bool:
    """Calculate and update hits_per_game for a single player.

    Returns True if the player was updated, False if skipped.
    """
    hits_per_game = calculate_hits_per_game(player.hits, player.games)

    if hits_per_game is None:
        if verbose:
            print(
                f"  SKIP: {player.player_name} - "
                f"Cannot calculate (hits={player.hits}, games={player.games})"
            )
        return False

    if verbose:
        print(
            f"  UPDATE: {player.player_name} - "
            f"hits_per_game = {hits_per_game} "
            f"({player.hits} hits / {player.games} games)"
        )

    if not dry_run:
        player.hits_per_game = hits_per_game

    return True


async def backfill_all(dry_run: bool = False, verbose: bool = False) -> dict:
    """Backfill hits_per_game for all players missing the value.

    Returns a summary dict with counts.
    """
    async with async_session_maker() as db:
        players = await get_players_needing_backfill(db)

        if not players:
            print("No players found with NULL hits_per_game. Nothing to do.")
            return {"total": 0, "updated": 0, "skipped": 0}

        print(f"Found {len(players)} players with NULL hits_per_game")
        if dry_run:
            print("DRY RUN MODE - No changes will be made\n")
        print()

        updated = 0
        skipped = 0

        for player in players:
            if await backfill_player(db, player, dry_run, verbose):
                updated += 1
            else:
                skipped += 1

        if not dry_run:
            await db.commit()
            print(f"\nCommitted changes to database.")

        return {"total": len(players), "updated": updated, "skipped": skipped}


def main():
    parser = argparse.ArgumentParser(
        description="Backfill hits_per_game for existing players"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show detailed output"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Backfill hits_per_game Script")
    print("=" * 60)
    print()

    result = asyncio.run(backfill_all(dry_run=args.dry_run, verbose=args.verbose))

    print()
    print("-" * 60)
    print("Summary:")
    print(f"  Total players processed: {result['total']}")
    print(f"  Updated: {result['updated']}")
    print(f"  Skipped (insufficient data): {result['skipped']}")
    print("-" * 60)

    if args.dry_run and result["updated"] > 0:
        print("\nTo apply these changes, run without --dry-run")


if __name__ == "__main__":
    main()
