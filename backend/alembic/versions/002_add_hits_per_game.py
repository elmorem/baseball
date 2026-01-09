"""Add hits_per_game column to players table.

Revision ID: 002_add_hits_per_game
Revises: 001_initial_schema
Create Date: 2025-01-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_hits_per_game"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add hits_per_game column to players table."""
    # Add the new column
    op.add_column(
        "players",
        sa.Column("hits_per_game", sa.Numeric(precision=8, scale=3), nullable=True),
    )

    # Add index for efficient sorting
    op.create_index(
        "idx_hits_per_game_desc", "players", [sa.text("hits_per_game DESC")]
    )


def downgrade() -> None:
    """Remove hits_per_game column from players table."""
    op.drop_index("idx_hits_per_game_desc", table_name="players")
    op.drop_column("players", "hits_per_game")
