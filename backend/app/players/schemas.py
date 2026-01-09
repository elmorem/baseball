"""Pydantic schemas for player data validation and serialization."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PlayerBase(BaseModel):
    """Base schema for player data."""

    player_name: str = Field(
        ..., min_length=1, max_length=100, description="Player's full name"
    )
    position: Optional[str] = Field(
        None, max_length=50, description="Player's position"
    )
    games: Optional[int] = Field(None, ge=0, description="Number of games played")
    at_bats: Optional[int] = Field(None, ge=0, description="Number of at-bats")
    runs: Optional[int] = Field(None, ge=0, description="Number of runs scored")
    hits: Optional[int] = Field(None, ge=0, description="Number of hits")
    doubles: Optional[int] = Field(None, ge=0, description="Number of doubles")
    triples: Optional[int] = Field(None, ge=0, description="Number of triples")
    home_runs: Optional[int] = Field(None, ge=0, description="Number of home runs")
    rbis: Optional[int] = Field(None, ge=0, description="Runs batted in")
    walks: Optional[int] = Field(None, ge=0, description="Number of walks")
    strikeouts: Optional[int] = Field(None, ge=0, description="Number of strikeouts")
    stolen_bases: Optional[int] = Field(
        None, ge=0, description="Number of stolen bases"
    )
    caught_stealing: Optional[int] = Field(
        None, ge=0, description="Times caught stealing"
    )
    batting_average: Optional[Decimal] = Field(
        None, ge=0, le=1, description="Batting average (0.000 - 1.000)"
    )
    on_base_percentage: Optional[Decimal] = Field(
        None, ge=0, le=1, description="On-base percentage"
    )
    slugging_percentage: Optional[Decimal] = Field(
        None, ge=0, le=2, description="Slugging percentage"
    )
    ops: Optional[Decimal] = Field(
        None, ge=0, le=3, description="On-base plus slugging"
    )
    hits_per_game: Optional[Decimal] = Field(
        None, ge=0, description="Hits per game (hits / games)"
    )

    @field_validator("position")
    @classmethod
    def validate_position(cls, v: Optional[str]) -> Optional[str]:
        """Validate position is a known baseball position."""
        if v is None:
            return v
        valid_positions = {
            "P",
            "C",
            "1B",
            "2B",
            "3B",
            "SS",
            "LF",
            "CF",
            "RF",
            "OF",
            "DH",
            "IF",
            "UT",
        }
        v_upper = v.upper()
        if v_upper not in valid_positions:
            return v  # Allow non-standard positions but don't normalize
        return v_upper


class PlayerCreate(PlayerBase):
    """Schema for creating a new player."""

    pass


class PlayerUpdate(BaseModel):
    """Schema for updating an existing player. All fields optional."""

    player_name: Optional[str] = Field(None, min_length=1, max_length=100)
    position: Optional[str] = Field(None, max_length=50)
    games: Optional[int] = Field(None, ge=0)
    at_bats: Optional[int] = Field(None, ge=0)
    runs: Optional[int] = Field(None, ge=0)
    hits: Optional[int] = Field(None, ge=0)
    doubles: Optional[int] = Field(None, ge=0)
    triples: Optional[int] = Field(None, ge=0)
    home_runs: Optional[int] = Field(None, ge=0)
    rbis: Optional[int] = Field(None, ge=0)
    walks: Optional[int] = Field(None, ge=0)
    strikeouts: Optional[int] = Field(None, ge=0)
    stolen_bases: Optional[int] = Field(None, ge=0)
    caught_stealing: Optional[int] = Field(None, ge=0)
    batting_average: Optional[Decimal] = Field(None, ge=0, le=1)
    on_base_percentage: Optional[Decimal] = Field(None, ge=0, le=1)
    slugging_percentage: Optional[Decimal] = Field(None, ge=0, le=2)
    ops: Optional[Decimal] = Field(None, ge=0, le=3)
    hits_per_game: Optional[Decimal] = Field(None, ge=0)


class PlayerDescriptionResponse(BaseModel):
    """Schema for player description response."""

    id: UUID = Field(..., description="Description ID")
    content: str = Field(..., description="AI-generated description")
    model_used: Optional[str] = Field(None, description="AI model used")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed")
    cost_usd: Optional[Decimal] = Field(None, description="Cost in USD")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}


class PlayerResponse(PlayerBase):
    """Schema for player response with all fields."""

    id: UUID = Field(..., description="Player's unique identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    descriptions: list[PlayerDescriptionResponse] = Field(
        default_factory=list, description="AI-generated descriptions"
    )

    model_config = {"from_attributes": True}


class PlayerListResponse(BaseModel):
    """Schema for paginated player list response."""

    items: list[PlayerResponse] = Field(..., description="List of players")
    total: int = Field(..., ge=0, description="Total number of players")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")
