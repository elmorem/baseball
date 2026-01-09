"""FastAPI router for player endpoints."""

import csv
import io
import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Annotated, Optional
from uuid import UUID

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ActiveUser
from app.database import async_session_maker, get_db
from app.ai.service import generate_player_description
from app.models.player_description import PlayerDescription

logger = logging.getLogger(__name__)

# External API URL for baseball player data
EXTERNAL_API_URL = "https://api.hirefraction.com/api/test/baseball"

# Known player name corrections for encoding issues from the external API
PLAYER_NAME_CORRECTIONS = {
    "A Beltr?": "A Beltré",
    "C Beltr?n": "C Beltrán",
    "E Encarnaci?n": "E Encarnación",
    "J B?ez": "J Báez",
    "M San?": "M Sanó",
    "P ?lvarez": "P Álvarez",
}

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

router = APIRouter(prefix="/players", tags=["Players"])


# ============================================================================
# Static routes MUST come before dynamic /{player_id} routes
# ============================================================================


@router.delete(
    "/all",
    status_code=status.HTTP_200_OK,
    summary="Delete all players",
)
async def delete_all_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> dict:
    """Delete all players and their descriptions from the database.

    Requires authentication. Use with caution - this removes all player data.

    Returns:
        Count of deleted players and descriptions.
    """
    # Delete descriptions first (foreign key constraint)
    desc_result = await db.execute(text("DELETE FROM player_descriptions"))
    desc_count = desc_result.rowcount

    # Delete all players
    player_result = await db.execute(text("DELETE FROM players"))
    player_count = player_result.rowcount

    await db.commit()

    logger.info(f"Deleted {player_count} players and {desc_count} descriptions")

    return {
        "deleted_players": player_count,
        "deleted_descriptions": desc_count,
        "message": "All players and descriptions deleted",
    }


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


@router.post(
    "/import-from-api",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Import players from external API",
)
async def import_players_from_api(
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Trigger background import of players from the external baseball API.

    This endpoint fetches player data from https://api.hirefraction.com/api/test/baseball
    and imports it into the local database. The import runs as a background task.

    Data validation includes:
    - Name sanitization (fixes encoding issues)
    - Numeric field validation
    - Required field checks

    No authentication required for demo purposes.

    Returns:
        Status message indicating import has started.
    """
    background_tasks.add_task(_import_players_task)
    return {"message": "Import started", "status": "processing"}


# ============================================================================
# List and CRUD endpoints
# ============================================================================


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
    summary="Update a player (PUT)",
)
@router.patch(
    "/{player_id}",
    response_model=PlayerResponse,
    summary="Update a player (PATCH)",
)
async def update_existing_player(
    player_id: UUID,
    player_update: PlayerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> PlayerResponse:
    """Update an existing player.

    Requires authentication.

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
    "/{player_id}/generate-description",
    response_model=PlayerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI description for a player",
)
async def generate_player_description_endpoint(
    player_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> PlayerResponse:
    """Generate an AI description for a player based on their stats.

    Requires authentication. Uses OpenAI to generate an engaging description.

    Args:
        player_id: Player's UUID.
        db: Database session.
        current_user: Authenticated user.

    Returns:
        Updated player with new description.

    Raises:
        HTTPException: If player not found or AI service error.
    """
    player = await get_player_by_id(db, player_id)

    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    try:
        # Generate description using AI service
        result = await generate_player_description(player)

        # Save to database
        description = PlayerDescription(
            player_id=player_id,
            content=result["content"],
            model_used=result["model_used"],
            tokens_used=result["tokens_used"],
            cost_usd=result["cost_usd"],
        )

        db.add(description)
        await db.commit()

        # Refresh player to get updated descriptions
        await db.refresh(player)

        return PlayerResponse.model_validate(player)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"AI description generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(e)}",
        )


# ============================================================================
# Helper functions
# ============================================================================


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


async def _import_players_task() -> None:
    """Background task to import players from the external API."""
    logger.info("Starting player import from external API")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(EXTERNAL_API_URL)
            response.raise_for_status()
            data = response.json()

        # The API returns an array of player objects
        players_data = (
            data
            if isinstance(data, list)
            else data.get("data", data.get("players", []))
        )

        async with async_session_maker() as db:
            created = 0
            errors = 0

            for player_data in players_data:
                try:
                    # Map external API fields to our schema
                    mapped_data = _map_external_player(player_data)
                    player_create = PlayerCreate(**mapped_data)
                    await create_player(db, player_create)
                    created += 1
                except Exception as e:
                    logger.warning(f"Failed to import player: {e}")
                    errors += 1

            logger.info(f"Import completed: {created} created, {errors} errors")

    except httpx.HTTPError as e:
        logger.error(f"HTTP error during import: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during import: {e}")


def _sanitize_player_name(name: str) -> str:
    """Sanitize and fix encoding issues in player names.

    Args:
        name: Raw player name from external API.

    Returns:
        Cleaned player name with encoding fixes applied.
    """
    if not name:
        return name

    # Apply known corrections for encoding issues
    if name in PLAYER_NAME_CORRECTIONS:
        return PLAYER_NAME_CORRECTIONS[name]

    # Remove any remaining ? characters that indicate encoding issues
    # and log a warning for unknown cases
    if "?" in name:
        logger.warning(f"Unknown encoding issue in player name: {name}")
        # Keep the name but flag it
        name = name.replace("?", "")

    # Strip whitespace and normalize spaces
    name = " ".join(name.split())

    return name


def _is_placeholder_value(value: any) -> bool:
    """Check if a value is a placeholder/missing data indicator.

    Args:
        value: Value to check.

    Returns:
        True if the value represents missing/unavailable data.
    """
    if value is None:
        return True
    str_val = str(value).strip().lower()
    return str_val in ["", "--", "-", "n/a", "na", "null", "none", ".", ".."]


def _validate_integer(value: any, field_name: str, min_val: int = 0) -> Optional[int]:
    """Validate and convert a value to integer.

    Args:
        value: Value to convert.
        field_name: Name of field for logging.
        min_val: Minimum allowed value.

    Returns:
        Validated integer or None if invalid.
    """
    if _is_placeholder_value(value):
        return None

    try:
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        int_val = int(value)
        if int_val < min_val:
            logger.warning(f"Invalid {field_name}: {int_val} < {min_val}")
            return None
        return int_val
    except (ValueError, TypeError):
        logger.warning(f"Cannot convert {field_name} to int: {value}")
        return None


def _validate_decimal(
    value: any, field_name: str, min_val: float = 0.0, max_val: float = None
) -> Optional[Decimal]:
    """Validate and convert a value to Decimal.

    Args:
        value: Value to convert.
        field_name: Name of field for logging.
        min_val: Minimum allowed value.
        max_val: Maximum allowed value (optional).

    Returns:
        Validated Decimal or None if invalid.
    """
    if _is_placeholder_value(value):
        return None

    try:
        if isinstance(value, str):
            value = value.strip()
        dec_val = Decimal(str(value))
        if dec_val < min_val:
            logger.warning(f"Invalid {field_name}: {dec_val} < {min_val}")
            return None
        if max_val is not None and dec_val > max_val:
            logger.warning(f"Invalid {field_name}: {dec_val} > {max_val}")
            return None
        return dec_val
    except (InvalidOperation, ValueError, TypeError):
        logger.warning(f"Cannot convert {field_name} to decimal: {value}")
        return None


def _map_external_player(data: dict) -> dict:
    """Map external API player data to our schema format.

    The external API uses different field names that need to be mapped.
    Includes data validation and sanitization.

    Args:
        data: Raw player data from external API.

    Returns:
        Mapped and validated data matching PlayerCreate schema.

    Raises:
        ValueError: If required fields are missing or invalid.
    """
    # Field mapping from external API to our schema
    field_mappings = {
        "player_name": ["Player name", "Player", "player_name", "name", "Name"],
        "position": ["position", "Pos", "Position"],
        "games": ["Games", "G", "games"],
        "at_bats": ["At-bat", "AB", "at_bats", "AtBats", "At Bats"],
        "runs": ["Runs", "R", "runs"],
        "hits": ["Hits", "H", "hits"],
        "doubles": ["Double (2B)", "2B", "doubles", "Doubles"],
        "triples": ["third baseman", "3B", "triples", "Triples"],
        "home_runs": ["home run", "HR", "home_runs", "HomeRuns", "Home Runs"],
        "rbis": ["run batted in", "RBI", "rbis", "RBIs"],
        "walks": ["a walk", "BB", "walks", "Walks"],
        "strikeouts": ["Strikeouts", "SO", "strikeouts"],
        "stolen_bases": [
            "stolen base",
            "SB",
            "stolen_bases",
            "StolenBases",
            "Stolen Bases",
        ],
        "caught_stealing": [
            "Caught stealing",
            "CS",
            "caught_stealing",
            "CaughtStealing",
            "Caught Stealing",
        ],
        "batting_average": [
            "AVG",
            "batting_average",
            "BattingAverage",
            "Batting Average",
        ],
        "on_base_percentage": [
            "On-base Percentage",
            "OBP",
            "on_base_percentage",
            "OnBasePercentage",
        ],
        "slugging_percentage": [
            "Slugging Percentage",
            "SLG",
            "slugging_percentage",
            "SluggingPercentage",
            "Slugging Percentage",
        ],
        "ops": ["On-base Plus Slugging", "OPS", "ops"],
    }

    # Integer fields with validation
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

    # Decimal fields with validation ranges
    decimal_fields = {
        "batting_average": (0.0, 1.0),
        "on_base_percentage": (0.0, 1.0),
        "slugging_percentage": (0.0, 2.0),
        "ops": (0.0, 3.0),
    }

    result = {}

    for our_field, possible_names in field_mappings.items():
        for name in possible_names:
            if name in data:
                value = data[name]
                if value is None or value == "":
                    break

                # Handle player_name with sanitization
                if our_field == "player_name":
                    value = _sanitize_player_name(str(value))
                    if not value:
                        raise ValueError("Player name is required and cannot be empty")
                    result[our_field] = value

                # Handle integer fields
                elif our_field in int_fields:
                    int_val = _validate_integer(value, our_field)
                    if int_val is not None:
                        result[our_field] = int_val

                # Handle decimal fields
                elif our_field in decimal_fields:
                    min_val, max_val = decimal_fields[our_field]
                    dec_val = _validate_decimal(value, our_field, min_val, max_val)
                    if dec_val is not None:
                        result[our_field] = dec_val

                # Handle other string fields (position)
                else:
                    result[our_field] = str(value).strip()

                break

    # Validate required fields
    if "player_name" not in result:
        raise ValueError("player_name is required")

    return result
