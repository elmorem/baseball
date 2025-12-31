# API Documentation

## Overview

The Baseball Stats API is a RESTful API built with FastAPI. All endpoints are prefixed with `/api/v1` and return JSON responses.

**Base URL:** `http://localhost:8000/api/v1`

**Interactive Documentation:**
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## Authentication

The API uses JWT (JSON Web Token) authentication with a dual-token system:

| Token Type | Header | Lifetime | Purpose |
|------------|--------|----------|---------|
| Access Token | `Authorization: Bearer <token>` | 15 minutes | API authentication |
| Refresh Token | Request body | 7 days | Obtain new access tokens |

### Getting Tokens

1. Register or login to receive tokens
2. Include the access token in the `Authorization` header
3. When access token expires, use refresh token to get new tokens

---

## Endpoints

### Health Check

#### `GET /api/v1/health`

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "Baseball Stats API",
  "version": "0.1.0"
}
```

---

## Authentication Endpoints

### Register User

#### `POST /api/v1/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| email | Valid email format |
| username | 3-50 characters, alphanumeric + underscore only |
| password | Minimum 8 characters, must include uppercase, lowercase, and digit |

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 400 | Email already registered |
| 400 | Username already taken |
| 422 | Validation error (see detail) |

---

### Login

#### `POST /api/v1/auth/login`

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 401 | Invalid credentials |

---

### Refresh Token

#### `POST /api/v1/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 401 | Invalid or expired refresh token |

---

### Get Current User

#### `GET /api/v1/auth/me`

Get the currently authenticated user's information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 401 | Not authenticated |
| 401 | Invalid token |

---

## Player Endpoints

All player endpoints require authentication.

### List Players

#### `GET /api/v1/players`

Get a paginated list of players with optional filtering.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | integer | 0 | Number of records to skip |
| limit | integer | 100 | Maximum records to return (max: 1000) |
| search | string | - | Filter by name (case-insensitive) |
| position | string | - | Filter by position |

**Example Request:**
```
GET /api/v1/players?search=Mike&position=OF&skip=0&limit=10
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Mike Trout",
    "position": "CF",
    "games": 134,
    "at_bats": 470,
    "hits": 147,
    "home_runs": 40,
    "batting_average": 0.313,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### Get Player

#### `GET /api/v1/players/{player_id}`

Get a single player by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| player_id | string (UUID) | Player's unique identifier |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Mike Trout",
  "position": "CF",
  "games": 134,
  "at_bats": 470,
  "hits": 147,
  "home_runs": 40,
  "batting_average": 0.313,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "description": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "content": "Mike Trout is a generational talent with exceptional power and speed...",
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 404 | Player not found |

---

### Create Player

#### `POST /api/v1/players`

Create a new player.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Shohei Ohtani",
  "position": "DH",
  "games": 159,
  "at_bats": 599,
  "hits": 191,
  "home_runs": 44,
  "batting_average": 0.319
}
```

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Player's full name |
| position | string | Playing position |

**Optional Fields:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| games | integer | 0 | Games played |
| at_bats | integer | 0 | Total at-bats |
| hits | integer | 0 | Total hits |
| home_runs | integer | 0 | Home runs |
| batting_average | float | 0.0 | Batting average (0-1) |

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Shohei Ohtani",
  "position": "DH",
  "games": 159,
  "at_bats": 599,
  "hits": 191,
  "home_runs": 44,
  "batting_average": 0.319,
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 422 | Validation error |

---

### Update Player

#### `PATCH /api/v1/players/{player_id}`

Update an existing player. Only provided fields are updated.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| player_id | string (UUID) | Player's unique identifier |

**Request Body (all fields optional):**
```json
{
  "games": 160,
  "home_runs": 45,
  "batting_average": 0.325
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Shohei Ohtani",
  "position": "DH",
  "games": 160,
  "at_bats": 599,
  "hits": 191,
  "home_runs": 45,
  "batting_average": 0.325,
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 404 | Player not found |
| 422 | Validation error |

---

### Delete Player

#### `DELETE /api/v1/players/{player_id}`

Delete a player.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| player_id | string (UUID) | Player's unique identifier |

**Response (204 No Content):**
No response body.

**Error Responses:**
| Status | Detail |
|--------|--------|
| 404 | Player not found |

---

### Import Players from CSV

#### `POST /api/v1/players/import`

Bulk import players from a CSV file.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| file | file | CSV file with player data |

**CSV Format:**
```csv
name,position,games,at_bats,hits,home_runs,batting_average
Mike Trout,CF,134,470,147,40,0.313
Shohei Ohtani,DH,159,599,191,44,0.319
```

**Required CSV Columns:**
- `name`
- `position`

**Response (201 Created):**
```json
{
  "imported": 2,
  "message": "Successfully imported 2 players"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 400 | File must be CSV |
| 400 | Missing required columns: name, position |

---

## AI Endpoints

### Generate Player Description

#### `POST /api/v1/ai/players/{player_id}/description`

Generate an AI description for a player.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| player_id | string (UUID) | Player's unique identifier |

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440003",
  "player_id": "550e8400-e29b-41d4-a716-446655440001",
  "content": "Mike Trout is widely considered one of the greatest players of his generation. His exceptional combination of power hitting and elite speed makes him a true five-tool player. With a career batting average above .300 and consistent 40+ home run seasons, Trout continues to dominate at the highest level.",
  "created_at": "2024-01-15T12:30:00Z"
}
```

**Error Responses:**
| Status | Detail |
|--------|--------|
| 404 | Player not found |
| 503 | AI service unavailable |

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

For validation errors (422):
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

## Rate Limiting

Currently, no rate limiting is implemented. For production deployments, consider adding rate limiting via:
- FastAPI middleware
- API Gateway (AWS API Gateway, Kong, etc.)
- Reverse proxy (Nginx, Traefik)

**Recommended limits:**
| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 requests/minute |
| Read operations | 100 requests/minute |
| Write operations | 30 requests/minute |
| AI generation | 5 requests/minute |

## Pagination

List endpoints support pagination via query parameters:

| Parameter | Description |
|-----------|-------------|
| skip | Number of records to skip (offset) |
| limit | Maximum records to return |

**Example:**
```
# Get page 2 with 20 items per page
GET /api/v1/players?skip=20&limit=20
```

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Backend Documentation](./BACKEND.md)
- [Testing Guide](./TESTING.md)
