"""Repository layer for player database operations."""

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.player import Player
from app.players.schemas import PlayerCreate, PlayerUpdate


async def get_players(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    position: Optional[str] = None,
    sort_by: str = "player_name",
    sort_order: str = "asc",
) -> list[Player]:
    """Get a list of players with optional filtering and pagination.

    Args:
        db: Database session.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return.
        search: Optional search term for player name.
        position: Optional filter by position.
        sort_by: Field to sort by.
        sort_order: Sort direction ('asc' or 'desc').

    Returns:
        List of Player objects.
    """
    query = select(Player).options(selectinload(Player.descriptions))

    # Apply filters
    if search:
        query = query.where(Player.player_name.ilike(f"%{search}%"))
    if position:
        query = query.where(Player.position == position.upper())

    # Apply sorting
    sort_column = getattr(Player, sort_by, Player.player_name)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def count_players(
    db: AsyncSession,
    search: Optional[str] = None,
    position: Optional[str] = None,
) -> int:
    """Count total players with optional filtering.

    Args:
        db: Database session.
        search: Optional search term for player name.
        position: Optional filter by position.

    Returns:
        Total count of matching players.
    """
    query = select(func.count(Player.id))

    if search:
        query = query.where(Player.player_name.ilike(f"%{search}%"))
    if position:
        query = query.where(Player.position == position.upper())

    result = await db.execute(query)
    return result.scalar() or 0


async def get_player_by_id(db: AsyncSession, player_id: UUID) -> Optional[Player]:
    """Get a player by ID.

    Args:
        db: Database session.
        player_id: Player's UUID.

    Returns:
        Player if found, None otherwise.
    """
    query = (
        select(Player)
        .options(selectinload(Player.descriptions))
        .where(Player.id == player_id)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_player(db: AsyncSession, player_create: PlayerCreate) -> Player:
    """Create a new player.

    Args:
        db: Database session.
        player_create: Player creation data.

    Returns:
        Newly created Player.
    """
    player = Player(**player_create.model_dump())

    db.add(player)
    await db.commit()
    await db.refresh(player)

    return player


async def update_player(
    db: AsyncSession,
    player: Player,
    player_update: PlayerUpdate,
) -> Player:
    """Update an existing player.

    Args:
        db: Database session.
        player: Existing Player object.
        player_update: Update data (only non-None fields applied).

    Returns:
        Updated Player.
    """
    update_data = player_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(player, field, value)

    await db.commit()
    await db.refresh(player)

    return player


async def delete_player(db: AsyncSession, player: Player) -> None:
    """Delete a player.

    Args:
        db: Database session.
        player: Player to delete.
    """
    await db.delete(player)
    await db.commit()
