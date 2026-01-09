# Baseball Stats Application - Code Walkthrough Guide

## Document Purpose
This guide is designed for a 1-hour code review walkthrough. It provides detailed references to key files and line numbers for all major features of the repository.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Authentication System](#3-authentication-system)
4. [Player Management](#4-player-management)
5. [AI Description Generation](#5-ai-description-generation)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Database Design](#7-database-design)
8. [Infrastructure & DevOps](#8-infrastructure--devops)
9. [Testing Strategy](#9-testing-strategy)
10. [Suggested Review Flow](#10-suggested-review-flow)

---

## 1. Project Overview

### Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI (Python) | 3.12 |
| Frontend | React + TypeScript | 18 / 5.5 |
| Database | PostgreSQL | 16 |
| ORM | SQLAlchemy (async) | 2.0 |
| Build Tool | Vite | 5 |
| Containerization | Docker | Multi-stage |
| CI/CD | GitHub Actions | - |

### Key Files Overview
| File | Purpose | Lines |
|------|---------|-------|
| [backend/app/main.py](backend/app/main.py) | FastAPI app entry point | 150 |
| [frontend/src/App.tsx](frontend/src/App.tsx) | React app entry & router | 233 |
| [docker-compose.yml](docker-compose.yml) | Container orchestration | 94 |

---

## 2. Backend Architecture

### 2.1 Application Entry Point
**File:** [backend/app/main.py](backend/app/main.py)

| Feature | Lines | Description |
|---------|-------|-------------|
| Lifespan management | 18-39 | Async context manager for startup/shutdown |
| FastAPI app creation | 43-51 | App initialization with metadata |
| CORS middleware | 55-62 | Cross-origin resource sharing config |
| Request ID middleware | 65-87 | UUID tracking for debugging |
| Health check endpoint | 90-115 | `/api/v1/health` for monitoring |
| Router registration | 119-121 | Mounts auth, players, AI routers |

**Key Code Points:**
- **Line 31**: Database initialization on startup
- **Line 38**: Database cleanup on shutdown
- **Line 57**: CORS origins loaded from settings
- **Line 81-82**: Request ID generation and storage

### 2.2 Configuration
**File:** [backend/app/config.py](backend/app/config.py)

| Setting | Lines | Description |
|---------|-------|-------------|
| DATABASE_URL | 12-15 | Async PostgreSQL connection string |
| SECRET_KEY | 18-22 | JWT signing key (min 32 chars) |
| ALGORITHM | 23 | JWT algorithm (HS256) |
| ACCESS_TOKEN_EXPIRE_MINUTES | 24-26 | Token expiration (30 min default) |
| OPENAI_API_KEY | 29-31 | AI service integration |
| ALLOWED_ORIGINS | 34-38 | CORS whitelist (comma-separated) |
| DB_POOL settings | 44-49 | Connection pool configuration |

**Key Code Points:**
- **Lines 51-56**: Pydantic Settings configuration with .env support
- **Lines 58-61**: Property to parse CORS origins from string to list

### 2.3 Database Layer
**File:** [backend/app/database.py](backend/app/database.py)

| Function | Lines | Description |
|----------|-------|-------------|
| `get_engine()` | 16-30 | Creates async SQLAlchemy engine with NullPool |
| `AsyncSessionLocal` | 37-43 | Session factory with auto-commit disabled |
| `get_db()` | 49-69 | FastAPI dependency for DB sessions |
| `init_db()` | 72-80 | Connection test on startup |
| `close_db()` | 83-88 | Engine disposal on shutdown |

**Key Code Points:**
- **Line 26**: NullPool used (asyncpg handles pooling)
- **Line 27**: `pool_pre_ping=True` for connection verification
- **Lines 62-67**: Transaction commit/rollback handling

---

## 3. Authentication System

### 3.1 Security Utilities
**File:** [backend/app/auth/security.py](backend/app/auth/security.py)

| Function | Lines | Description |
|----------|-------|-------------|
| `pwd_context` | 13 | Bcrypt password hasher |
| `verify_password()` | 23-34 | Password verification |
| `get_password_hash()` | 37-47 | Password hashing |
| `create_access_token()` | 50-83 | JWT access token creation |
| `create_refresh_token()` | 86-109 | JWT refresh token (7 days) |
| `verify_token()` | 112-135 | Token validation & decoding |

**Key Code Points:**
- **Line 20**: Refresh token expires in 7 days
- **Lines 72-78**: Token payload includes `exp`, `type`, `jti` (unique ID)
- **Lines 129-131**: Token type validation (access vs refresh)

### 3.2 Authentication Service
**File:** [backend/app/auth/service.py](backend/app/auth/service.py)

| Function | Lines | Description |
|----------|-------|-------------|
| `get_user_by_email()` | 13-24 | Lookup by email (case-insensitive) |
| `get_user_by_username()` | 27-38 | Lookup by username |
| `get_user_by_id()` | 41-52 | Lookup by UUID |
| `create_user()` | 55-77 | User creation with hashed password |
| `authenticate_user()` | 80-99 | Email/password validation |

**Key Code Points:**
- **Line 23**: Email lowercased for lookup
- **Lines 65-71**: New user creation with password hashing
- **Lines 91-97**: Sequential validation (user exists, then password)

### 3.3 Authentication Router
**File:** [backend/app/auth/router.py](backend/app/auth/router.py)

| Endpoint | Lines | Method | Description |
|----------|-------|--------|-------------|
| `/auth/register` | 28-67 | POST | User registration |
| `/auth/login` | 70-113 | POST | OAuth2 password flow login |
| `/auth/refresh` | 116-151 | POST | Token refresh |
| `/auth/me` | 154-170 | GET | Get current user |

**Key Code Points:**
- **Lines 51-64**: Duplicate email/username validation
- **Lines 93-100**: Invalid credentials handling with 401
- **Lines 108-111**: Token pair generation on login
- **Line 137**: Refresh token type validation

### 3.4 Authentication Dependencies
**File:** [backend/app/auth/dependencies.py](backend/app/auth/dependencies.py)

| Component | Lines | Description |
|-----------|-------|-------------|
| `oauth2_scheme` | 16 | Bearer token extraction |
| `get_current_user()` | 19-61 | Token validation + user lookup |
| `get_current_active_user()` | 64-83 | Active status check |
| `CurrentUser` | 87 | Type alias for dependency |
| `ActiveUser` | 88 | Type alias for active user |

**Key Code Points:**
- **Line 42**: Access token type verification
- **Lines 51-54**: UUID parsing from token subject
- **Lines 78-82**: Inactive user rejection (403)

---

## 4. Player Management

### 4.1 Player Model
**File:** [backend/app/models/player.py](backend/app/models/player.py)

| Section | Lines | Description |
|---------|-------|-------------|
| Basic Info | 46-57 | `player_name`, `position` |
| Counting Stats | 59-132 | Games, at-bats, hits, HRs, etc. |
| Rate Stats | 134-157 | BA, OBP, SLG, OPS |
| Relationships | 159-165 | One-to-many with descriptions |
| Indexes | 167-173 | Composite indexes for queries |

**Key Code Points:**
- **Line 49**: `player_name` indexed for search
- **Lines 79-82**: `hits` indexed for sorting
- **Lines 97-102**: `home_runs` indexed for sorting
- **Lines 135-138**: Batting average as Numeric(5,3)
- **Line 163**: Cascade delete for descriptions

### 4.2 Player Repository
**File:** [backend/app/players/repository.py](backend/app/players/repository.py)

| Function | Lines | Description |
|----------|-------|-------------|
| `get_players()` | 14-56 | List with filters, sort, pagination |
| `count_players()` | 59-82 | Total count for pagination |
| `get_player_by_id()` | 85-101 | Single player lookup |
| `create_player()` | 104-120 | Player creation |
| `update_player()` | 123-146 | Partial update |
| `delete_player()` | 149-157 | Player deletion |

**Key Code Points:**
- **Line 37**: `selectinload` for eager loading descriptions
- **Lines 40-43**: Search filter with `ilike` (case-insensitive)
- **Lines 46-50**: Dynamic sorting by column name
- **Line 138**: `exclude_unset=True` for partial updates

### 4.3 Player Schemas
**File:** [backend/app/players/schemas.py](backend/app/players/schemas.py)

| Schema | Lines | Description |
|--------|-------|-------------|
| `PlayerBase` | 11-47 | Common validation rules |
| `PlayerCreate` | 76-79 | Creation payload |
| `PlayerUpdate` | 82-102 | Partial update (all optional) |
| `PlayerDescriptionResponse` | 105-115 | AI description response |
| `PlayerResponse` | 118-128 | Full player with relations |
| `PlayerListResponse` | 131-138 | Paginated list response |

**Key Code Points:**
- **Lines 14-16**: `player_name` required, 1-100 chars
- **Lines 36-37**: `batting_average` constrained 0-1
- **Lines 49-73**: Position validation (known positions)
- **Line 128**: `from_attributes=True` for ORM mode

### 4.4 Player Router
**File:** [backend/app/players/router.py](backend/app/players/router.py)

| Endpoint | Lines | Method | Auth | Description |
|----------|-------|--------|------|-------------|
| `/players/all` | 68-100 | DELETE | Yes | Delete all players |
| `/players/import` | 103-169 | POST | Yes | CSV file import |
| `/players/import-from-api` | 172-198 | POST | No | External API import |
| `/players` | 206-255 | GET | No | List with pagination |
| `/players/{id}` | 258-287 | GET | No | Get single player |
| `/players` | 290-314 | POST | Yes | Create player |
| `/players/{id}` | 317-358 | PUT/PATCH | Yes | Update player |
| `/players/{id}` | 361-391 | DELETE | Yes | Delete player |
| `/players/{id}/generate-description` | 394-459 | POST | Yes | Generate AI description |

**Key Code Points:**
- **Lines 36-43**: Player name corrections for encoding issues
- **Lines 63-65**: Static routes before dynamic `/{player_id}` routes
- **Lines 213-218**: Query parameters for filtering/sorting
- **Lines 234-244**: Pagination calculation
- **Lines 428-439**: AI description saved to database

### 4.5 Data Import Helpers
**File:** [backend/app/players/router.py](backend/app/players/router.py) (continued)

| Function | Lines | Description |
|----------|-------|-------------|
| `_parse_csv_row()` | 467-515 | CSV row to player data |
| `_import_players_task()` | 518-555 | Background API import |
| `_sanitize_player_name()` | 558-584 | Fix encoding issues |
| `_is_placeholder_value()` | 587-599 | Detect missing data |
| `_validate_integer()` | 602-626 | Integer validation |
| `_validate_decimal()` | 629-659 | Decimal validation with ranges |
| `_map_external_player()` | 662-790 | External API field mapping |

**Key Code Points:**
- **Lines 478-497**: Field type categorization (int vs decimal)
- **Lines 523-526**: HTTP client with timeout
- **Lines 678-725**: Field name mapping for external API
- **Lines 744-749**: Validation ranges for rate stats

---

## 5. AI Description Generation

### 5.1 AI Service
**File:** [backend/app/ai/service.py](backend/app/ai/service.py)

| Function | Lines | Description |
|----------|-------|-------------|
| `get_openai_client()` | 15-22 | Lazy-loaded OpenAI client |
| `_format_stat()` | 25-31 | Stat value formatting |
| `_build_player_prompt()` | 34-65 | Prompt construction |
| `generate_player_description()` | 68-124 | Main generation function |

**Key Code Points:**
- **Lines 19-21**: API key validation
- **Lines 43-64**: Full stat sheet in prompt
- **Lines 87-94**: System prompt for sports writer persona
- **Lines 98-109**: OpenAI API call with temperature 0.7
- **Lines 114-117**: Cost estimation ($0.30/1M tokens)

### 5.2 Player Description Model
**File:** [backend/app/models/player_description.py](backend/app/models/player_description.py)

| Field | Lines | Description |
|-------|-------|-------------|
| `player_id` | 35-40 | FK to players (CASCADE delete) |
| `content` | 42-46 | Generated description text |
| `model_used` | 48-52 | AI model name |
| `tokens_used` | 54-58 | Token consumption |
| `cost_usd` | 60-64 | Cost tracking |

**Key Code Points:**
- **Line 36**: Cascade delete with player
- **Line 61**: Cost as Numeric(10,6) for precision

---

## 6. Frontend Architecture

### 6.1 Application Root
**File:** [frontend/src/App.tsx](frontend/src/App.tsx)

| Component | Lines | Description |
|-----------|-------|-------------|
| `Navigation` | 10-69 | Auth-aware navbar |
| `RootLayout` | 76-87 | Layout with AuthProvider |
| `HomePage` | 92-137 | Landing page with feature cards |
| `ErrorBoundary` | 142-159 | Route error handling |
| `NotFoundPage` | 164-179 | 404 page |
| `router` | 184-224 | Route configuration |
| `App` | 226-231 | Root with providers |

**Key Code Points:**
- **Lines 11**: Auth state via `useAuth()` hook
- **Lines 37-64**: Conditional rendering based on auth
- **Lines 78-86**: AuthProvider wraps all routes
- **Lines 184-224**: Nested route structure

### 6.2 Authentication Context
**File:** [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx)

| Feature | Lines | Description |
|---------|-------|-------------|
| Initial state | 14-19 | Default auth state |
| AuthContext | 24 | React context creation |
| State management | 38-45 | `updateState` helper |
| Auto-load user | 50-72 | Check tokens on mount |
| `login()` | 77-97 | Login handler |
| `register()` | 102-126 | Registration + auto-login |
| `logout()` | 131-138 | Clear tokens & state |
| `useAuth()` | 168-175 | Context hook |
| `withAuth()` | 181-203 | HOC for protected routes |

**Key Code Points:**
- **Lines 52-55**: Skip load if no stored tokens
- **Lines 57-68**: Auto-restore session from tokens
- **Lines 109-111**: Auto-login after registration
- **Lines 150-159**: Memoized context value

### 6.3 API Client
**File:** [frontend/src/lib/api.ts](frontend/src/lib/api.ts)

| Feature | Lines | Description |
|---------|-------|-------------|
| Token manager | 21-30 | localStorage operations |
| Base URL config | 37-48 | Environment-aware URL |
| Axios instance | 55-148 | Configured client |
| Request interceptor | 67-80 | Auth header injection |
| Response interceptor | 85-145 | Token refresh & errors |
| Health check | 192-199 | API connectivity test |

**Key Code Points:**
- **Lines 37-48**: Prod uses relative path, dev uses localhost
- **Lines 69-73**: Bearer token added to requests
- **Lines 93-133**: Automatic token refresh on 401
- **Lines 128-129**: Redirect to login on refresh failure

### 6.4 Auth Service
**File:** [frontend/src/services/auth.ts](frontend/src/services/auth.ts)

| Function | Lines | Description |
|----------|-------|-------------|
| `register()` | 13-16 | POST /auth/register |
| `login()` | 22-40 | OAuth2 form login |
| `getCurrentUser()` | 45-48 | GET /auth/me |
| `refreshToken()` | 53-67 | POST /auth/refresh |
| `logout()` | 72-74 | Clear stored tokens |
| `hasStoredTokens()` | 79-81 | Check for auth state |

**Key Code Points:**
- **Lines 23-26**: URLSearchParams for form data
- **Lines 27-31**: Content-Type for OAuth2 flow
- **Lines 36-37**: Store tokens after login

### 6.5 Players Service
**File:** [frontend/src/services/players.ts](frontend/src/services/players.ts)

| Function | Lines | Description |
|----------|-------|-------------|
| `buildQueryString()` | 19-43 | Query params builder |
| `getPlayers()` | 48-52 | GET with filters |
| `getPlayer()` | 57-60 | GET single player |
| `createPlayer()` | 65-68 | POST new player |
| `updatePlayer()` | 73-76 | PATCH player |
| `deletePlayer()` | 81-83 | DELETE player |
| `generateDescription()` | 88-91 | POST AI generation |

**Key Code Points:**
- **Lines 22-39**: Conditional param appending
- **Line 74**: Uses PATCH for updates

### 6.6 Player List Page
**File:** [frontend/src/pages/players/PlayerListPage.tsx](frontend/src/pages/players/PlayerListPage.tsx)

| Feature | Lines | Description |
|---------|-------|-------------|
| Position options | 22-34 | Filter dropdown values |
| Sort options | 39-46 | Sortable columns |
| State management | 49-64 | Players, loading, pagination |
| `fetchPlayers()` | 66-90 | API call with params |
| Filter handlers | 97-115 | Reset page on filter change |
| Filters UI | 127-190 | Search, position, sort controls |
| Table | 206-291 | Player data display |
| Pagination | 294-323 | Previous/Next navigation |

**Key Code Points:**
- **Lines 70-78**: Build params from state
- **Lines 80-85**: Error handling
- **Lines 97-100**: Page reset on search
- **Lines 253-288**: Table rows with links

### 6.7 Player Detail Page
**File:** [frontend/src/pages/players/PlayerDetailPage.tsx](frontend/src/pages/players/PlayerDetailPage.tsx)

| Feature | Lines | Description |
|---------|-------|-------------|
| State setup | 36-41 | Player, loading, generating |
| `fetchPlayer()` | 43-57 | Load player data |
| `handleGenerateDescription()` | 63-75 | AI generation trigger |
| `handleDelete()` | 77-89 | Delete with navigation |
| Stats grid | 181-287 | Counting + rate stats display |
| Descriptions section | 289-322 | AI descriptions list |
| Delete modal | 150-178 | Confirmation dialog |

**Key Code Points:**
- **Lines 68-69**: Update player after generation
- **Line 83**: Navigate to list after delete
- **Lines 309-319**: Description metadata display

---

## 7. Database Design

### 7.1 Base Mixins
**File:** [backend/app/models/base.py](backend/app/models/base.py)

| Mixin | Lines | Description |
|-------|-------|-------------|
| `Base` | 10-19 | Declarative base with type map |
| `TimestampMixin` | 22-38 | `created_at`, `updated_at` |
| `UUIDMixin` | 41-48 | UUID primary key |

**Key Code Points:**
- **Lines 17-19**: DateTime type annotation mapping
- **Lines 35-36**: Auto-update `updated_at` on change
- **Line 46**: UUID default via `uuid4()`

### 7.2 User Model
**File:** [backend/app/models/user.py](backend/app/models/user.py)

| Field | Lines | Description |
|-------|-------|-------------|
| `email` | 24-30 | Unique, indexed |
| `username` | 32-38 | Unique, indexed |
| `hashed_password` | 40-44 | Bcrypt hash |
| `is_active` | 46-51 | Account status |

### 7.3 Initial Migration
**File:** [backend/alembic/versions/001_initial_schema.py](backend/alembic/versions/001_initial_schema.py)

| Table | Lines | Description |
|-------|-------|-------------|
| `users` | 26-49 | User accounts |
| `players` | 52-100 | Player statistics |
| `player_descriptions` | 103-127 | AI descriptions |

**Key Code Points:**
- **Lines 48-49**: Unique indexes on email/username
- **Lines 94-100**: Descending indexes for sort queries
- **Lines 106-110**: Foreign key with CASCADE delete

---

## 8. Infrastructure & DevOps

### 8.1 Docker Compose
**File:** [docker-compose.yml](docker-compose.yml)

| Service | Lines | Port | Description |
|---------|-------|------|-------------|
| `postgres` | 2-19 | 5433:5432 | PostgreSQL 16 database |
| `backend` | 21-44 | 8001:8000 | FastAPI application |
| `frontend` | 46-60 | 3001:80 | Production Nginx |
| `frontend-dev` | 62-85 | 5173:5173 | Development with hot-reload |

**Key Code Points:**
- **Lines 13-17**: Health check for Postgres
- **Lines 35-41**: Health check for backend
- **Lines 76-79**: Volume mounts for dev
- **Lines 83-85**: Profiles for dev/test mode

### 8.2 Backend Dockerfile
**File:** [backend/Dockerfile](backend/Dockerfile)

| Stage | Lines | Description |
|-------|-------|-------------|
| Builder | 6-28 | Compile dependencies |
| Runtime | 33-71 | Minimal production image |

**Key Code Points:**
- **Line 26**: NullPool for async engine
- **Lines 49-52**: Non-root user creation
- **Lines 67-68**: Health check definition
- **Line 71**: Uvicorn command

### 8.3 Frontend Dockerfile
**File:** [frontend/Dockerfile](frontend/Dockerfile)

| Stage | Lines | Description |
|-------|-------|-------------|
| Base | 4-44 | Node + Playwright dependencies |
| Development | 47-53 | Vite dev server |
| Builder | 56-69 | Production build |
| Production | 72-108 | Nginx serving |

**Key Code Points:**
- **Lines 9-32**: Playwright browser dependencies
- **Lines 41**: Chromium browser installation
- **Lines 84-88**: Health check endpoint creation
- **Lines 104-105**: dumb-init for signal handling

### 8.4 CI/CD Pipeline
**File:** [.github/workflows/ci.yml](.github/workflows/ci.yml)

| Job | Lines | Description |
|-----|-------|-------------|
| `backend` | 18-77 | Python tests + linting |
| `frontend` | 79-116 | TypeScript tests + linting |
| `e2e` | 121-159 | Playwright E2E (optional) |
| `build` | 162-191 | Docker image verification |

**Key Code Points:**
- **Lines 22-35**: PostgreSQL service container
- **Lines 52-54**: Ruff linting
- **Lines 57-58**: Black format check
- **Lines 64-70**: pytest with coverage
- **Lines 126**: `continue-on-error: true` for E2E

---

## 9. Testing Strategy

### 9.1 Backend Tests
- **Framework:** pytest with pytest-asyncio
- **Location:** `backend/tests/`
- **Coverage:** Auth and player endpoints

### 9.2 Frontend Unit Tests
- **Framework:** Vitest + React Testing Library
- **Location:** `frontend/src/**/__tests__/`
- **Coverage:** Components, services, hooks

### 9.3 E2E Tests
- **Framework:** Playwright
- **Location:** `frontend/e2e/`
- **Tests:** Auth flows, navigation, player CRUD

---

## 10. Suggested Review Flow

### Hour Breakdown (60 minutes)

#### Minutes 0-10: Overview & Entry Points
1. Start with [docker-compose.yml](docker-compose.yml) (all services)
2. [backend/app/main.py](backend/app/main.py) lines 43-51, 119-121
3. [frontend/src/App.tsx](frontend/src/App.tsx) lines 184-224

#### Minutes 10-20: Database Layer
1. [backend/app/models/base.py](backend/app/models/base.py) (mixins)
2. [backend/app/models/player.py](backend/app/models/player.py) lines 15-41, 167-173
3. [backend/alembic/versions/001_initial_schema.py](backend/alembic/versions/001_initial_schema.py)

#### Minutes 20-35: Authentication Flow
1. [backend/app/auth/security.py](backend/app/auth/security.py) lines 50-83, 112-135
2. [backend/app/auth/router.py](backend/app/auth/router.py) lines 70-113
3. [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) lines 77-97
4. [frontend/src/lib/api.ts](frontend/src/lib/api.ts) lines 85-145

#### Minutes 35-50: Player Management
1. [backend/app/players/repository.py](backend/app/players/repository.py) lines 14-56
2. [backend/app/players/router.py](backend/app/players/router.py) lines 206-255, 394-459
3. [frontend/src/services/players.ts](frontend/src/services/players.ts)
4. [frontend/src/pages/players/PlayerListPage.tsx](frontend/src/pages/players/PlayerListPage.tsx) lines 66-90

#### Minutes 50-55: AI Integration
1. [backend/app/ai/service.py](backend/app/ai/service.py) lines 68-124
2. [frontend/src/pages/players/PlayerDetailPage.tsx](frontend/src/pages/players/PlayerDetailPage.tsx) lines 63-75, 289-322

#### Minutes 55-60: CI/CD & Testing
1. [.github/workflows/ci.yml](.github/workflows/ci.yml)
2. Discussion of test coverage and deployment

---

## Quick Reference: Key Line Numbers

| Feature | File | Critical Lines |
|---------|------|----------------|
| App startup | backend/app/main.py | 31, 38 |
| JWT creation | backend/app/auth/security.py | 72-78 |
| Password hash | backend/app/auth/security.py | 46-47 |
| Login endpoint | backend/app/auth/router.py | 93, 108-111 |
| Token validation | backend/app/auth/dependencies.py | 42-44 |
| Player query | backend/app/players/repository.py | 37, 40-50 |
| CSV import | backend/app/players/router.py | 145-169 |
| AI generation | backend/app/ai/service.py | 98-109 |
| Token refresh | frontend/src/lib/api.ts | 93-133 |
| Auth context | frontend/src/contexts/AuthContext.tsx | 77-97 |
| Player list fetch | frontend/src/pages/players/PlayerListPage.tsx | 66-90 |

---

## Document Metadata
- **Created:** 2025-01-09
- **Repository:** Baseball Stats Application
- **Branch:** feature/pr17-detailed-docs
