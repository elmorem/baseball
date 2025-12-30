"""Tests for player Pydantic schemas."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.players.schemas import PlayerCreate, PlayerListResponse, PlayerUpdate


class TestPlayerCreate:
    """Tests for PlayerCreate schema validation."""

    def test_valid_player_create_minimal(self):
        """Test valid player with only required fields."""
        player = PlayerCreate(player_name="Babe Ruth")

        assert player.player_name == "Babe Ruth"
        assert player.position is None
        assert player.games is None

    def test_valid_player_create_full(self):
        """Test valid player with all fields."""
        player = PlayerCreate(
            player_name="Babe Ruth",
            position="OF",
            games=152,
            at_bats=540,
            runs=150,
            hits=200,
            doubles=35,
            triples=10,
            home_runs=54,
            rbis=137,
            walks=130,
            strikeouts=80,
            stolen_bases=5,
            caught_stealing=3,
            batting_average=Decimal("0.370"),
            on_base_percentage=Decimal("0.480"),
            slugging_percentage=Decimal("0.772"),
            ops=Decimal("1.252"),
        )

        assert player.player_name == "Babe Ruth"
        assert player.position == "OF"
        assert player.home_runs == 54
        assert player.batting_average == Decimal("0.370")

    def test_player_name_required(self):
        """Test player_name is required."""
        with pytest.raises(ValidationError):
            PlayerCreate()

    def test_player_name_not_empty(self):
        """Test player_name cannot be empty."""
        with pytest.raises(ValidationError):
            PlayerCreate(player_name="")

    def test_player_name_too_long(self):
        """Test player_name max length."""
        with pytest.raises(ValidationError):
            PlayerCreate(player_name="A" * 101)

    def test_position_normalized_uppercase(self):
        """Test standard positions are normalized to uppercase."""
        player = PlayerCreate(player_name="Test", position="of")
        assert player.position == "OF"

        player = PlayerCreate(player_name="Test", position="ss")
        assert player.position == "SS"

    def test_position_nonstandard_preserved(self):
        """Test non-standard positions are preserved."""
        player = PlayerCreate(player_name="Test", position="Utility")
        assert player.position == "Utility"

    def test_negative_stats_rejected(self):
        """Test negative stats are rejected."""
        with pytest.raises(ValidationError):
            PlayerCreate(player_name="Test", games=-1)

        with pytest.raises(ValidationError):
            PlayerCreate(player_name="Test", home_runs=-5)

    def test_batting_average_range(self):
        """Test batting average must be 0-1."""
        # Valid
        player = PlayerCreate(player_name="Test", batting_average=Decimal("0.300"))
        assert player.batting_average == Decimal("0.300")

        # Invalid - too high
        with pytest.raises(ValidationError):
            PlayerCreate(player_name="Test", batting_average=Decimal("1.5"))

    def test_slugging_range(self):
        """Test slugging percentage can be 0-2."""
        # Valid high slugging
        player = PlayerCreate(player_name="Test", slugging_percentage=Decimal("1.500"))
        assert player.slugging_percentage == Decimal("1.500")

        # Invalid
        with pytest.raises(ValidationError):
            PlayerCreate(player_name="Test", slugging_percentage=Decimal("2.5"))


class TestPlayerUpdate:
    """Tests for PlayerUpdate schema."""

    def test_all_fields_optional(self):
        """Test all fields are optional for updates."""
        update = PlayerUpdate()
        assert update.player_name is None

    def test_partial_update(self):
        """Test partial update with some fields."""
        update = PlayerUpdate(home_runs=50, rbis=120)

        assert update.player_name is None
        assert update.home_runs == 50
        assert update.rbis == 120

    def test_validation_still_applies(self):
        """Test validation still applies to provided fields."""
        with pytest.raises(ValidationError):
            PlayerUpdate(games=-1)


class TestPlayerListResponse:
    """Tests for PlayerListResponse schema."""

    def test_valid_list_response(self):
        """Test valid paginated response."""
        response = PlayerListResponse(
            items=[],
            total=100,
            page=1,
            page_size=20,
            pages=5,
        )

        assert response.total == 100
        assert response.page == 1
        assert response.page_size == 20
        assert response.pages == 5

    def test_page_size_max(self):
        """Test page_size maximum validation."""
        with pytest.raises(ValidationError):
            PlayerListResponse(
                items=[],
                total=100,
                page=1,
                page_size=101,  # Over max
                pages=1,
            )
