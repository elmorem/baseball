"""FastAPI router for player endpoints."""

import csv
import io
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ActiveUser
from app.database import get_db
from app.players.repository import (
    count_players,
    create_player,
    delete_player,
    get_player_by_id,
    get_players,
    update_player,
)
from app.players.schemas import (
    PlayerCreate,
    PlayerListResponse,
    PlayerResponse,
    PlayerUpdate,
)
from app.players.utils import calculate_hits_per_game

router = APIRouter(prefix="/players", tags=["Players"])


@router.get(
    "",
    response_model=PlayerListResponse,
    summary="List all players",
)
async def list_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by player name"),
    position: Optional[str] = Query(None, description="Filter by position"),
    sort_by: str = Query("player_name", description="Field to sort by"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
) -> PlayerListResponse:
    """Get a paginated list of players.

    Args:
        db: Database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        search: Optional search term for player name.
        position: Optional filter by position.
        sort_by: Field to sort by.
        sort_order: Sort direction ('asc' or 'desc').

    Returns:
        Paginated list of players.
    """
    skip = (page - 1) * page_size

    players = await get_players(
        db,
        skip=skip,
        limit=page_size,
        search=search,
        position=position,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total = await count_players(db, search=search, position=position)
    pages = (total + page_size - 1) // page_size

    return PlayerListResponse(
        items=[PlayerResponse.model_validate(p) for p in players],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get(
    "/{player_id}",
    response_model=PlayerResponse,
    summary="Get player by ID",
)
async def get_player(
    player_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlayerResponse:
    """Get a single player by ID.

    Args:
        player_id: Player's UUID.
        db: Database session.

    Returns:
        Player details.

    Raises:
        HTTPException: If player not found.
    """
    player = await get_player_by_id(db, player_id)

    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    return PlayerResponse.model_validate(player)


@router.post(
    "",
    response_model=PlayerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new player",
)
async def create_new_player(
    player_create: PlayerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> PlayerResponse:
    """Create a new player.

    Requires authentication.

    Args:
        player_create: Player creation data.
        db: Database session.
        current_user: Authenticated user.

    Returns:
        Newly created player.
    """
    player = await create_player(db, player_create)
    return PlayerResponse.model_validate(player)


@router.put(
    "/{player_id}",
    response_model=PlayerResponse,
    summary="Update a player",
)
async def update_existing_player(
    player_id: UUID,
    player_update: PlayerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> PlayerResponse:
    """Update an existing player.

    Requires authentication. If hits or games are updated, hits_per_game
    will be automatically recalculated.

    Args:
        player_id: Player's UUID.
        player_update: Update data.
        db: Database session.
        current_user: Authenticated user.

    Returns:
        Updated player.

    Raises:
        HTTPException: If player not found.
    """
    player = await get_player_by_id(db, player_id)

    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    # Check if hits or games are being updated - need to recalculate hits_per_game
    update_data = player_update.model_dump(exclude_unset=True)
    if "hits" in update_data or "games" in update_data:
        # Get the final values after update
        new_hits = update_data.get("hits", player.hits)
        new_games = update_data.get("games", player.games)

        # Recalculate hits_per_game
        new_hits_per_game = calculate_hits_per_game(new_hits, new_games)

        # Add to update data (will override any manually set value)
        player_update = PlayerUpdate(
            **{**update_data, "hits_per_game": new_hits_per_game}
        )

    updated_player = await update_player(db, player, player_update)
    return PlayerResponse.model_validate(updated_player)


@router.delete(
    "/{player_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a player",
)
async def delete_existing_player(
    player_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> None:
    """Delete a player.

    Requires authentication.

    Args:
        player_id: Player's UUID.
        db: Database session.
        current_user: Authenticated user.

    Raises:
        HTTPException: If player not found.
    """
    player = await get_player_by_id(db, player_id)

    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    await delete_player(db, player)


@router.post(
    "/import",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Import players from CSV",
)
async def import_players_from_csv(
    file: Annotated[UploadFile, File(description="CSV file with player data")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> dict:
    """Import players from a CSV file.

    Requires authentication. CSV must have headers matching player fields.
    Required column: player_name

    Args:
        file: CSV file upload.
        db: Database session.
        current_user: Authenticated user.

    Returns:
        Import summary with success/error counts.

    Raises:
        HTTPException: If file is not CSV or parsing fails.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV",
        )

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded",
        )

    reader = csv.DictReader(io.StringIO(decoded))

    if "player_name" not in (reader.fieldnames or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must have 'player_name' column",
        )

    created = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            player_data = _parse_csv_row(row)
            player_create = PlayerCreate(**player_data)
            await create_player(db, player_create)
            created += 1
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    return {
        "created": created,
        "errors": len(errors),
        "error_details": errors[:10],  # Limit error details
    }


def _parse_csv_row(row: dict) -> dict:
    """Parse a CSV row into player data.

    Handles type conversion for numeric fields.

    Args:
        row: Dictionary from CSV reader.

    Returns:
        Cleaned dictionary for PlayerCreate.
    """
    int_fields = {
        "games",
        "at_bats",
        "runs",
        "hits",
        "doubles",
        "triples",
        "home_runs",
        "rbis",
        "walks",
        "strikeouts",
        "stolen_bases",
        "caught_stealing",
    }
    decimal_fields = {
        "batting_average",
        "on_base_percentage",
        "slugging_percentage",
        "ops",
    }

    result = {}

    for key, value in row.items():
        key = key.strip().lower().replace(" ", "_")
        value = value.strip() if value else None

        if not value:
            continue

        if key in int_fields:
            result[key] = int(value)
        elif key in decimal_fields:
            result[key] = value
        else:
            result[key] = value

    return result
