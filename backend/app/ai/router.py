"""FastAPI router for AI description endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.service import generate_player_description
from app.auth.dependencies import ActiveUser
from app.database import get_db
from app.models.player_description import PlayerDescription
from app.players.repository import get_player_by_id
from app.players.schemas import PlayerDescriptionResponse

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/players/{player_id}/description",
    response_model=PlayerDescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI description for a player",
)
async def create_player_description(
    player_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: ActiveUser,
) -> PlayerDescriptionResponse:
    """Generate an AI description for a player based on their stats.

    Requires authentication. Uses OpenAI to generate an engaging description
    based on the player's statistics.

    Args:
        player_id: Player's UUID.
        db: Database session.
        current_user: Authenticated user.

    Returns:
        Generated description with metadata.

    Raises:
        HTTPException: If player not found or OpenAI error.
    """
    # Get player
    player = await get_player_by_id(db, player_id)
    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    try:
        # Generate description
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
        await db.refresh(description)

        return PlayerDescriptionResponse.model_validate(description)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(e)}",
        )


@router.get(
    "/players/{player_id}/descriptions",
    response_model=list[PlayerDescriptionResponse],
    summary="Get all descriptions for a player",
)
async def get_player_descriptions(
    player_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PlayerDescriptionResponse]:
    """Get all AI-generated descriptions for a player.

    Args:
        player_id: Player's UUID.
        db: Database session.

    Returns:
        List of descriptions.

    Raises:
        HTTPException: If player not found.
    """
    player = await get_player_by_id(db, player_id)
    if player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    return [PlayerDescriptionResponse.model_validate(d) for d in player.descriptions]
