"""Player model for baseball statistics."""

from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.player_description import PlayerDescription


class Player(Base, UUIDMixin, TimestampMixin):
    """Baseball player with comprehensive statistics.

    Attributes:
        id: Unique identifier (UUID)
        player_name: Player's full name
        position: Player's position (e.g., 'P', 'C', '1B', 'OF')
        games: Number of games played
        at_bats: Number of at-bats
        runs: Number of runs scored
        hits: Number of hits
        doubles: Number of doubles
        triples: Number of triples
        home_runs: Number of home runs
        rbis: Runs batted in
        walks: Number of walks (base on balls)
        strikeouts: Number of strikeouts
        stolen_bases: Number of stolen bases
        caught_stealing: Number of times caught stealing
        batting_average: Batting average (hits / at_bats)
        on_base_percentage: On-base percentage
        slugging_percentage: Slugging percentage
        ops: On-base plus slugging
        hits_per_game: Hits per game (hits / games)
        created_at: Timestamp when player was created
        updated_at: Timestamp when player was last updated
        descriptions: Related player descriptions
    """

    __tablename__ = "players"

    # Basic Information
    player_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Player's full name",
    )

    position: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Player's position (e.g., 'P', 'C', '1B', 'OF')",
    )

    # Counting Stats
    games: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of games played",
    )

    at_bats: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of at-bats",
    )

    runs: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of runs scored",
    )

    hits: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True,
        doc="Number of hits",
    )

    doubles: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of doubles",
    )

    triples: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of triples",
    )

    home_runs: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True,
        doc="Number of home runs",
    )

    rbis: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Runs batted in",
    )

    walks: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of walks (base on balls)",
    )

    strikeouts: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of strikeouts",
    )

    stolen_bases: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of stolen bases",
    )

    caught_stealing: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of times caught stealing",
    )

    # Rate Stats (stored as decimals with 3 decimal places)
    batting_average: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=5, scale=3),
        nullable=True,
        doc="Batting average (hits / at_bats)",
    )

    on_base_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=5, scale=3),
        nullable=True,
        doc="On-base percentage",
    )

    slugging_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=5, scale=3),
        nullable=True,
        doc="Slugging percentage",
    )

    ops: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=5, scale=3),
        nullable=True,
        doc="On-base plus slugging (OBP + SLG)",
    )

    hits_per_game: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=8, scale=3),
        nullable=True,
        doc="Hits per game (hits / games)",
    )

    # Relationships
    descriptions: Mapped[List["PlayerDescription"]] = relationship(
        "PlayerDescription",
        back_populates="player",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_player_name_lower", "player_name"),
        Index("idx_hits_desc", hits.desc()),
        Index("idx_home_runs_desc", home_runs.desc()),
        Index("idx_batting_average_desc", batting_average.desc()),
        Index("idx_hits_per_game_desc", hits_per_game.desc()),
    )

    def __repr__(self) -> str:
        """String representation of Player."""
        return (
            f"<Player(id={self.id}, name={self.player_name}, "
            f"position={self.position}, BA={self.batting_average})>"
        )
