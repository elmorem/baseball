"""Initial schema with users, players, and player_descriptions tables.

Revision ID: 001_initial_schema
Revises:
Create Date: 2025-12-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial database schema."""

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Create indexes for users table
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # Create players table
    op.create_table(
        "players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("player_name", sa.String(100), nullable=False),
        sa.Column("position", sa.String(50), nullable=True),
        # Counting stats
        sa.Column("games", sa.Integer(), nullable=True),
        sa.Column("at_bats", sa.Integer(), nullable=True),
        sa.Column("runs", sa.Integer(), nullable=True),
        sa.Column("hits", sa.Integer(), nullable=True),
        sa.Column("doubles", sa.Integer(), nullable=True),
        sa.Column("triples", sa.Integer(), nullable=True),
        sa.Column("home_runs", sa.Integer(), nullable=True),
        sa.Column("rbis", sa.Integer(), nullable=True),
        sa.Column("walks", sa.Integer(), nullable=True),
        sa.Column("strikeouts", sa.Integer(), nullable=True),
        sa.Column("stolen_bases", sa.Integer(), nullable=True),
        sa.Column("caught_stealing", sa.Integer(), nullable=True),
        # Rate stats
        sa.Column("batting_average", sa.Numeric(precision=5, scale=3), nullable=True),
        sa.Column(
            "on_base_percentage", sa.Numeric(precision=5, scale=3), nullable=True
        ),
        sa.Column(
            "slugging_percentage", sa.Numeric(precision=5, scale=3), nullable=True
        ),
        sa.Column("ops", sa.Numeric(precision=5, scale=3), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Create indexes for players table
    op.create_index("ix_players_player_name", "players", ["player_name"])
    op.create_index("idx_player_name_lower", "players", ["player_name"])
    op.create_index("idx_hits_desc", "players", [sa.text("hits DESC")])
    op.create_index("idx_home_runs_desc", "players", [sa.text("home_runs DESC")])
    op.create_index(
        "idx_batting_average_desc", "players", [sa.text("batting_average DESC")]
    )

    # Create player_descriptions table
    op.create_table(
        "player_descriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "player_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model_used", sa.String(50), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Create indexes for player_descriptions table
    op.create_index(
        "ix_player_descriptions_player_id", "player_descriptions", ["player_id"]
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("player_descriptions")
    op.drop_table("players")
    op.drop_table("users")
