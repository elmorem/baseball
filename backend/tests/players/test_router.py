"""Tests for player API endpoints."""

import io

import pytest
from httpx import AsyncClient


@pytest.fixture
def test_player_data() -> dict:
    """Test player data."""
    return {
        "player_name": "Babe Ruth",
        "position": "OF",
        "games": 152,
        "at_bats": 540,
        "hits": 200,
        "home_runs": 54,
        "batting_average": "0.370",
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, test_user_data: dict) -> dict:
    """Get authentication headers for a test user."""
    # Register user
    await client.post("/api/v1/auth/register", json=test_user_data)

    # Login
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user_data["email"],
            "password": test_user_data["password"],
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestListPlayers:
    """Tests for GET /api/v1/players endpoint."""

    @pytest.mark.asyncio
    async def test_list_players_empty(self, client: AsyncClient):
        """Test listing players when none exist."""
        response = await client.get("/api/v1/players")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_players_with_data(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test listing players with data."""
        # Create a player
        await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )

        response = await client.get("/api/v1/players")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["player_name"] == "Babe Ruth"

    @pytest.mark.asyncio
    async def test_list_players_pagination(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test pagination parameters."""
        # Create multiple players
        for i in range(5):
            await client.post(
                "/api/v1/players",
                json={"player_name": f"Player {i}"},
                headers=auth_headers,
            )

        response = await client.get("/api/v1/players?page=1&page_size=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    @pytest.mark.asyncio
    async def test_list_players_search(self, client: AsyncClient, auth_headers: dict):
        """Test search filter."""
        await client.post(
            "/api/v1/players",
            json={"player_name": "Babe Ruth"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/players",
            json={"player_name": "Lou Gehrig"},
            headers=auth_headers,
        )

        response = await client.get("/api/v1/players?search=Babe")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["player_name"] == "Babe Ruth"

    @pytest.mark.asyncio
    async def test_list_players_position_filter(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test position filter."""
        await client.post(
            "/api/v1/players",
            json={"player_name": "Player 1", "position": "OF"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/players",
            json={"player_name": "Player 2", "position": "1B"},
            headers=auth_headers,
        )

        response = await client.get("/api/v1/players?position=OF")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


class TestGetPlayer:
    """Tests for GET /api/v1/players/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_player_success(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test getting a player by ID."""
        create_response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )
        player_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/players/{player_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["player_name"] == "Babe Ruth"
        assert data["home_runs"] == 54

    @pytest.mark.asyncio
    async def test_get_player_not_found(self, client: AsyncClient):
        """Test getting non-existent player."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/players/{fake_id}")

        assert response.status_code == 404


class TestCreatePlayer:
    """Tests for POST /api/v1/players endpoint."""

    @pytest.mark.asyncio
    async def test_create_player_success(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test creating a player."""
        response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["player_name"] == "Babe Ruth"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_player_no_auth(
        self, client: AsyncClient, test_player_data: dict
    ):
        """Test creating player without auth fails."""
        response = await client.post("/api/v1/players", json=test_player_data)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_player_invalid_data(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test creating player with invalid data."""
        response = await client.post(
            "/api/v1/players",
            json={"player_name": ""},  # Empty name
            headers=auth_headers,
        )

        assert response.status_code == 422


class TestUpdatePlayer:
    """Tests for PUT /api/v1/players/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_player_success(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test updating a player."""
        create_response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )
        player_id = create_response.json()["id"]

        response = await client.put(
            f"/api/v1/players/{player_id}",
            json={"home_runs": 60},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["home_runs"] == 60
        assert data["player_name"] == "Babe Ruth"  # Unchanged

    @pytest.mark.asyncio
    async def test_update_player_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test updating non-existent player."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(
            f"/api/v1/players/{fake_id}",
            json={"home_runs": 60},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_player_no_auth(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test updating player without auth fails."""
        create_response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )
        player_id = create_response.json()["id"]

        response = await client.put(
            f"/api/v1/players/{player_id}",
            json={"home_runs": 60},
        )

        assert response.status_code == 401


class TestDeletePlayer:
    """Tests for DELETE /api/v1/players/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_player_success(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test deleting a player."""
        create_response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )
        player_id = create_response.json()["id"]

        response = await client.delete(
            f"/api/v1/players/{player_id}", headers=auth_headers
        )

        assert response.status_code == 204

        # Verify deleted
        get_response = await client.get(f"/api/v1/players/{player_id}")
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_player_no_auth(
        self, client: AsyncClient, auth_headers: dict, test_player_data: dict
    ):
        """Test deleting player without auth fails."""
        create_response = await client.post(
            "/api/v1/players", json=test_player_data, headers=auth_headers
        )
        player_id = create_response.json()["id"]

        response = await client.delete(f"/api/v1/players/{player_id}")

        assert response.status_code == 401


class TestImportPlayers:
    """Tests for POST /api/v1/players/import endpoint."""

    @pytest.mark.asyncio
    async def test_import_csv_success(self, client: AsyncClient, auth_headers: dict):
        """Test importing players from CSV."""
        csv_content = (
            "player_name,position,home_runs\nBabe Ruth,OF,54\nLou Gehrig,1B,49"
        )

        response = await client.post(
            "/api/v1/players/import",
            files={
                "file": ("players.csv", io.BytesIO(csv_content.encode()), "text/csv")
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["created"] == 2
        assert data["errors"] == 0

    @pytest.mark.asyncio
    async def test_import_csv_no_auth(self, client: AsyncClient):
        """Test importing without auth fails."""
        csv_content = "player_name\nTest Player"

        response = await client.post(
            "/api/v1/players/import",
            files={
                "file": ("players.csv", io.BytesIO(csv_content.encode()), "text/csv")
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_import_csv_missing_name_column(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test import fails without player_name column."""
        csv_content = "position,home_runs\nOF,54"

        response = await client.post(
            "/api/v1/players/import",
            files={
                "file": ("players.csv", io.BytesIO(csv_content.encode()), "text/csv")
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "player_name" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_import_non_csv_file(self, client: AsyncClient, auth_headers: dict):
        """Test import rejects non-CSV files."""
        response = await client.post(
            "/api/v1/players/import",
            files={"file": ("players.txt", io.BytesIO(b"test"), "text/plain")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "CSV" in response.json()["detail"]
