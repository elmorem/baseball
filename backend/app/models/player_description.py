"""Player description model for AI-generated content."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class PlayerDescription(Base, UUIDMixin):
    """AI-generated description for a baseball player.

    Tracks AI model usage and costs for generating player descriptions.

    Attributes:
        id: Unique identifier (UUID)
        player_id: Foreign key to the player
        content: Generated description text
        model_used: Name of the AI model used (e.g., 'gpt-4', 'gpt-3.5-turbo')
        tokens_used: Number of tokens consumed
        cost_usd: Cost in USD for generating the description
        created_at: Timestamp when description was created
        player: Related player object
    """

    __tablename__ = "player_descriptions"

    player_id: Mapped[UUID] = mapped_column(
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to the player",
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="AI-generated description text",
    )

    model_used: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Name of the AI model used (e.g., 'gpt-4', 'gpt-3.5-turbo')",
    )

    tokens_used: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of tokens consumed for generation",
    )

    cost_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=6),
        nullable=True,
        doc="Cost in USD for generating the description",
    )

    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=datetime.utcnow,
        doc="Timestamp when description was created",
    )

    # Relationships
    player: Mapped["Player"] = relationship(
        "Player",
        back_populates="descriptions",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        """String representation of PlayerDescription."""
        return (
            f"<PlayerDescription(id={self.id}, player_id={self.player_id}, "
            f"model={self.model_used}, tokens={self.tokens_used})>"
        )
