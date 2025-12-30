# Baseball Stats Application - Implementation Plan

**Status:** APPROVED (2025-12-29)
**Created:** 2025-12-29
**Workflow:** Plan-Eval-Build

---

## Executive Summary

Build a full-stack Baseball Stats application with:
- **Backend:** FastAPI (Python 3.11+) with async SQLAlchemy
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Database:** PostgreSQL 15 with UUID primary keys
- **AI:** OpenAI GPT-4 for player descriptions with caching
- **Auth:** JWT with refresh tokens and token blacklist
- **Deployment:** Docker Compose
- **CI/CD:** GitHub Actions (Black, mypy, bandit, ESLint, Vitest, Playwright)

**Data Source:** https://api.hirefraction.com/api/test/baseball (200+ players with 18 stat fields)

**Estimated Timeline:** 25-35 days (1 developer)
**Total Estimated Lines:** ~3,500-3,900 lines across 8 PRs

---

## Technical Architecture

### Backend Stack
```
FastAPI (Python 3.11+)
├── SQLAlchemy 2.0 async ORM
├── Alembic migrations
├── Pydantic v2 validation
├── JWT authentication (access + refresh tokens)
├── FastAPI BackgroundTasks for imports
├── OpenAI SDK for descriptions
└── pytest + pytest-asyncio for testing
```

### Frontend Stack
```
React 18 + TypeScript + Vite
├── React Query v5 (server state)
├── React Router v6
├── Tailwind CSS
├── Axios with interceptors
├── React Hook Form + Zod
├── Vitest + React Testing Library
└── Playwright for E2E
```

### Infrastructure
```
Docker Compose
├── PostgreSQL 15
├── Backend (multi-stage build)
├── Frontend (Nginx)
└── Health checks
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Players Table
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(50),
    games INTEGER DEFAULT 0,
    at_bats INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    rbis INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    stolen_bases INTEGER DEFAULT 0,
    caught_stealing INTEGER,
    batting_average DECIMAL(4,3),
    on_base_percentage DECIMAL(4,3),
    slugging_percentage DECIMAL(4,3),
    ops DECIMAL(4,3),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_players_name ON players(player_name);
CREATE INDEX idx_players_home_runs ON players(home_runs DESC);
CREATE INDEX idx_players_hits ON players(hits DESC);
```

### Player Descriptions Table
```sql
CREATE TABLE player_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Token Blacklist Table (for logout)
```sql
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Create user account |
| POST | `/api/v1/auth/login` | No | Get access + refresh tokens |
| POST | `/api/v1/auth/refresh` | No | Get new access token |
| POST | `/api/v1/auth/logout` | Yes | Blacklist refresh token |
| GET | `/api/v1/auth/me` | Yes | Get current user |

### Players
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/players` | No | List with search/sort/pagination |
| GET | `/api/v1/players/{id}` | No | Get player by ID |
| PUT | `/api/v1/players/{id}` | Yes | Update player stats |
| POST | `/api/v1/players/import` | Yes | Trigger background import |

### Descriptions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/players/{id}/descriptions` | No | Get cached descriptions |
| POST | `/api/v1/players/{id}/descriptions` | No | Generate new description |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | No | Health check with DB status |

---

## PR Breakdown

### PR #1: Project Setup & Database Schema
**Branch:** `plan-eval-build/feature/project-setup`
**Lines:** 380-420
**Dependencies:** None
**Risk:** Low (2/10)

**Deliverables:**
- [x] Docker Compose (PostgreSQL, backend, frontend)
- [x] Backend project structure (FastAPI skeleton)
- [x] Frontend project structure (Vite + React)
- [x] Database schema with Alembic migrations
- [x] Health check endpoint
- [x] Environment configuration
- [x] README with setup instructions

**Acceptance Criteria:**
- [ ] `docker-compose up` starts all services
- [ ] Database migrations run successfully
- [ ] Health check returns 200 with DB status

---

### PR #2: Backend Authentication System
**Branch:** `plan-eval-build/feature/backend-auth`
**Lines:** 500-550
**Dependencies:** PR #1
**Risk:** High (8/10) - Security critical

**Deliverables:**
- [x] User model and repository
- [x] JWT access tokens (30-min expiry)
- [x] JWT refresh tokens (7-day expiry)
- [x] Token rotation on refresh
- [x] Token blacklist for logout
- [x] Password hashing with bcrypt
- [x] Auth endpoints (register, login, refresh, logout, me)
- [x] Comprehensive auth tests (85%+ coverage)

**Security Features:**
- HS256 algorithm with 32+ byte secret
- Audience/issuer claim validation
- Token JTI for blacklisting
- Short access token expiry

**Acceptance Criteria:**
- [ ] Users can register with unique email/username
- [ ] Login returns access + refresh tokens
- [ ] Refresh endpoint generates new access token
- [ ] Logout invalidates refresh token
- [ ] Test coverage >= 85%
- [ ] Bandit security scan passes

---

### PR #3: Player CRUD & Data Import
**Branch:** `plan-eval-build/feature/player-crud`
**Lines:** 500-550
**Dependencies:** PR #2
**Risk:** Medium (6/10)

**Deliverables:**
- [x] Player model and repository
- [x] CRUD endpoints with pagination
- [x] Search by name (case-insensitive)
- [x] Sort by hits, home_runs, batting_average
- [x] BackgroundTask for external API import
- [x] Pydantic aliases for field normalization
- [x] Unit and integration tests (80%+ coverage)

**Query Parameters:**
- `page`, `page_size` (pagination)
- `search` (player name)
- `sort_by` (hits, home_runs, batting_average)
- `sort_order` (asc, desc)

**Acceptance Criteria:**
- [ ] Player list with pagination works
- [ ] Search/filter/sort operations work
- [ ] Import task fetches from external API
- [ ] Test coverage >= 80%

---

### PR #4: OpenAI Integration & Caching
**Branch:** `plan-eval-build/feature/ai-descriptions`
**Lines:** 350-400
**Dependencies:** PR #3
**Risk:** Medium (5/10)

**Deliverables:**
- [x] PlayerDescription model
- [x] OpenAI service with retry logic
- [x] Description caching (no duplicate API calls)
- [x] Cost tracking (tokens, USD)
- [x] Graceful error handling
- [x] Tests with mocked OpenAI (80%+ coverage)

**Caching Strategy:**
1. Check database for existing description
2. If exists, return cached
3. If not, generate via OpenAI and cache

**Acceptance Criteria:**
- [ ] Descriptions generated via OpenAI API
- [ ] Caching prevents duplicate calls
- [ ] Cost tracking within 1% accuracy
- [ ] 503 returned if OpenAI unavailable
- [ ] Test coverage >= 80%

---

### PR #5: Frontend Authentication Flow
**Branch:** `plan-eval-build/feature/frontend-auth`
**Lines:** 480-520
**Dependencies:** PR #2
**Risk:** Medium (6/10)

**Deliverables:**
- [x] AuthContext with React Context API
- [x] Login and Register pages
- [x] ProtectedRoute component
- [x] JWT storage and auto-refresh
- [x] Axios interceptors for token handling
- [x] ErrorBoundary component
- [x] Component tests (70%+ coverage)

**Token Flow:**
1. Store access + refresh in localStorage
2. Axios interceptor adds Bearer token
3. On 401, attempt refresh
4. On refresh failure, redirect to login

**Acceptance Criteria:**
- [ ] Users can register and login
- [ ] Protected routes redirect when unauthenticated
- [ ] Token refresh happens automatically
- [ ] Logout clears tokens
- [ ] Test coverage >= 70%

---

### PR #6: Player List Interface
**Branch:** `plan-eval-build/feature/player-list`
**Lines:** 450-500
**Dependencies:** PR #5
**Risk:** Low (3/10)

**Deliverables:**
- [x] PlayerList component with React Query
- [x] SearchBar with debounce (300ms)
- [x] Sort controls (hits, home runs)
- [x] Pagination component
- [x] Loading skeletons
- [x] Empty state and error handling
- [x] Responsive design (mobile-first)
- [x] Component tests (70%+ coverage)

**UI Features:**
- Grid: 1 col (mobile), 2 cols (tablet), 3 cols (desktop)
- Debounced search input
- Sort toggle (asc/desc)
- Page size selector (10, 25, 50)

**Acceptance Criteria:**
- [ ] Player list renders correctly
- [ ] Search filters players by name
- [ ] Sort by hits/HRs works
- [ ] Pagination works correctly
- [ ] Responsive on all screen sizes
- [ ] Test coverage >= 70%

---

### PR #7: Player Detail & Editing
**Branch:** `plan-eval-build/feature/player-detail`
**Lines:** 450-500
**Dependencies:** PR #6, PR #4
**Risk:** Medium (5/10)

**Deliverables:**
- [x] PlayerDetail page
- [x] StatsTable component
- [x] PlayerEditForm with validation
- [x] DescriptionCard component
- [x] Generate description button
- [x] Optimistic updates with React Query
- [x] Component tests (70%+ coverage)

**Edit Form Validation:**
- All stat fields: non-negative integers
- Batting average: 0.000 - 1.000
- Required: player_name, position

**Acceptance Criteria:**
- [ ] Detail page shows all stats
- [ ] Edit form validates input
- [ ] Updates reflect immediately
- [ ] Description generation works
- [ ] Test coverage >= 70%

---

### PR #8: E2E Tests, CI/CD, Documentation
**Branch:** `plan-eval-build/feature/e2e-ci-docs`
**Lines:** 400-450
**Dependencies:** PR #7
**Risk:** Low (2/10)

**Deliverables:**
- [x] Playwright E2E tests (auth, players, descriptions)
- [x] GitHub Actions backend CI (Black, mypy, bandit, pytest)
- [x] GitHub Actions frontend CI (ESLint, TypeScript, Vitest)
- [x] GitHub Actions E2E workflow
- [x] Docker build optimization
- [x] API documentation (OpenAPI export)
- [x] Setup documentation

**E2E Test Scenarios:**
1. User registration and login
2. Protected route redirection
3. Player list search/sort/pagination
4. Player detail view
5. Player edit flow
6. Description generation

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] CI pipelines pass on all checks
- [ ] Docker images build successfully
- [ ] Documentation complete

---

## Test Strategy

### Backend (Target: 80%+ coverage)
- **Unit:** Services, repositories, security
- **Integration:** API endpoints with test database
- **Mocks:** OpenAI client, external API

### Frontend (Target: 70%+ coverage)
- **Component:** All major components
- **Integration:** Pages with MSW mocks
- **E2E:** Critical user journeys with Playwright

### Test Tools
| Layer | Tool |
|-------|------|
| Backend Unit | pytest + pytest-asyncio |
| Backend Integration | pytest + httpx |
| Frontend Unit | Vitest + RTL |
| Frontend E2E | Playwright |
| API Mocking | MSW, VCR.py |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenAI API failures | 7/10 | Medium | Retry logic, caching, graceful degradation |
| JWT security issues | 6/10 | Critical | Refresh tokens, blacklist, short expiry |
| External API dependency | 8/10 | Medium | BackgroundTasks, retry, manual fallback |
| DB connection exhaustion | 6/10 | Critical | Pool config, timeout, health monitoring |
| OpenAI cost overrun | 7/10 | High | Budget limits, rate limiting, cost tracking |
| CORS misconfiguration | 8/10 | Medium | Explicit origin whitelist in production |

---

## Success Criteria

### Functional
- [ ] Users can register, login, and logout
- [ ] Players display with search/sort/pagination
- [ ] Player details show all statistics
- [ ] Authenticated users can edit players
- [ ] AI descriptions generate and cache correctly

### Technical
- [ ] Backend test coverage >= 80%
- [ ] Frontend test coverage >= 70%
- [ ] E2E tests cover critical flows
- [ ] CI pipeline passes all checks
- [ ] Docker Compose works on first try
- [ ] API response time < 2s

### Quality
- [ ] Black formatting passes
- [ ] mypy type checking passes
- [ ] ESLint passes with no warnings
- [ ] Bandit security scan passes
- [ ] No hardcoded secrets

---

## Quality Gates

### Gate 1 (PR #1): Foundation
- [ ] Docker Compose starts all services
- [ ] Database schema matches design
- [ ] Health check returns 200

### Gate 2 (PR #2): Authentication
- [ ] All auth endpoints work
- [ ] JWT validation correct
- [ ] Test coverage >= 85%
- [ ] Bandit passes

### Gate 3 (PR #3): Player CRUD
- [ ] CRUD operations work
- [ ] Search/sort/pagination work
- [ ] Import task completes
- [ ] Test coverage >= 80%

### Gate 4 (PR #4): AI Descriptions
- [ ] Descriptions generate
- [ ] Caching works
- [ ] Cost tracking accurate
- [ ] Test coverage >= 80%

### Gate 5 (PR #5): Frontend Auth
- [ ] Login/register work
- [ ] Protected routes work
- [ ] Token refresh works
- [ ] Test coverage >= 70%

### Gate 6 (PR #6): Player List
- [ ] List renders correctly
- [ ] Search/sort work
- [ ] Responsive design works
- [ ] Test coverage >= 70%

### Gate 7 (PR #7): Player Detail
- [ ] Detail page works
- [ ] Edit form works
- [ ] Descriptions display
- [ ] Test coverage >= 70%

### Gate 8 (PR #8): E2E & CI
- [ ] E2E tests pass
- [ ] CI pipelines pass
- [ ] Documentation complete

---

## Environment Variables

### Backend
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/baseball
SECRET_KEY=your-32-character-secret-key-here
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend
```bash
VITE_API_URL=http://localhost:8000/api
```

---

## Approval

**Plan prepared by:** Claude Code (Plan-Eval-Build Workflow)
**Date:** 2025-12-29

**User Approval:** [ ] APPROVED / [ ] NEEDS CHANGES

---

*This plan was created following the Plan-Eval-Build workflow with:*
- *Comprehensive code analysis*
- *Detailed implementation planning*
- *Senior code review evaluation*
- *Risk assessment and mitigation*
- *Quality gates at each phase*
