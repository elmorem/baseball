# Baseball Stats Application Architecture

## Overview

The Baseball Stats application is a full-stack web application for managing baseball player statistics with AI-powered insights. It follows a modern microservices-inspired architecture with clear separation between frontend and backend concerns.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     React SPA (Vite + TypeScript)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ Auth Context │  │ React Query  │  │ React Router (Routes)    │   │   │
│  │  │ (JWT Tokens) │  │ (Data Cache) │  │ /login /players /players/:id│  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS (REST API)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Application                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ Auth Router  │  │Players Router│  │ AI Router                │   │   │
│  │  │ /auth/*      │  │ /players/*   │  │ /ai/*                    │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Middleware Layer                           │   │   │
│  │  │  CORS │ Request ID │ JWT Validation │ Error Handling          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                      ┌───────────────┼───────────────┐
                      │               │               │
                      ▼               ▼               ▼
┌──────────────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│      PostgreSQL          │ │   OpenAI     │ │   External Services  │
│  ┌────────────────────┐  │ │   API        │ │   (Future: MLB API)  │
│  │ Users Table        │  │ │              │ │                      │
│  │ Players Table      │  │ │  GPT-4       │ │                      │
│  │ PlayerDescriptions │  │ │  Embeddings  │ │                      │
│  └────────────────────┘  │ │              │ │                      │
└──────────────────────────┘ └──────────────┘ └──────────────────────┘
```

## Component Overview

### Frontend (React + TypeScript)

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Auth Context** | Global authentication state management | React Context API |
| **React Query** | Server state management, caching, sync | TanStack Query v5 |
| **Router** | Client-side routing with protected routes | React Router v6 |
| **UI Components** | Reusable UI elements | Tailwind CSS |
| **API Client** | HTTP client with interceptors | Axios |

### Backend (FastAPI + Python)

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Auth Module** | User registration, login, JWT tokens | passlib, python-jose |
| **Players Module** | CRUD operations for player data | SQLAlchemy ORM |
| **AI Module** | AI-generated player descriptions | OpenAI GPT-4 |
| **Database** | Async database operations | asyncpg, SQLAlchemy 2.0 |

### Infrastructure

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Containerization** | Consistent environments | Docker, Docker Compose |
| **CI/CD** | Automated testing and deployment | GitHub Actions |
| **Database** | Primary data store | PostgreSQL 16 |

## Data Flow

### Authentication Flow

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌────────┐
│Client│────▶│/auth/   │────▶│ Auth    │────▶│Database│
│      │     │register │     │ Service │     │        │
└──────┘     └─────────┘     └─────────┘     └────────┘
    │                              │
    │         JWT Tokens           │
    │◀─────────────────────────────│
    │
    │  Store in localStorage
    ▼
┌──────────────────┐
│ Subsequent       │
│ Requests with    │
│ Bearer Token     │
└──────────────────┘
```

### Player Data Flow

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌────────┐
│Client│────▶│/players │────▶│ Players │────▶│Database│
│      │     │         │     │ Service │     │        │
└──────┘     └─────────┘     └─────────┘     └────────┘
    │                              │
    │                              │ On Create/Update
    │                              ▼
    │                        ┌─────────┐
    │                        │ OpenAI  │
    │                        │ API     │
    │                        └─────────┘
    │                              │
    │  Player + AI Description     │
    │◀─────────────────────────────│
```

## Directory Structure

```
baseball/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings and configuration
│   │   ├── database.py          # Database connection management
│   │   ├── auth/                # Authentication module
│   │   │   ├── __init__.py
│   │   │   ├── router.py        # Auth API endpoints
│   │   │   ├── service.py       # Auth business logic
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   ├── security.py      # JWT & password utilities
│   │   │   └── dependencies.py  # FastAPI dependencies
│   │   ├── players/             # Players module
│   │   │   ├── __init__.py
│   │   │   ├── router.py        # Player API endpoints
│   │   │   ├── repository.py    # Database operations
│   │   │   └── schemas.py       # Pydantic models
│   │   ├── ai/                  # AI integration module
│   │   │   ├── __init__.py
│   │   │   ├── router.py        # AI API endpoints
│   │   │   └── service.py       # OpenAI integration
│   │   └── models/              # SQLAlchemy models
│   │       ├── __init__.py
│   │       ├── base.py          # Base model class
│   │       ├── user.py          # User model
│   │       ├── player.py        # Player model
│   │       └── player_description.py
│   ├── tests/                   # Backend tests
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root component with routes
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React contexts
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities and API client
│   │   └── types/               # TypeScript type definitions
│   ├── e2e/                     # Playwright E2E tests
│   ├── package.json
│   └── Dockerfile
├── docs/                        # Documentation
├── docker-compose.yml           # Local development setup
└── .github/workflows/           # CI/CD pipelines
```

## Security Architecture

### Authentication

- **Password Storage**: bcrypt hashing with automatic salt generation
- **Token Strategy**: Dual-token system (access + refresh tokens)
  - Access tokens: Short-lived (15 minutes), used for API requests
  - Refresh tokens: Long-lived (7 days), used to obtain new access tokens
- **Token Storage**: localStorage (with HttpOnly cookie option for production)

### API Security

- **CORS**: Configured to allow only specific origins
- **Request Validation**: Pydantic models validate all input
- **SQL Injection**: Prevented via SQLAlchemy ORM (parameterized queries)
- **Rate Limiting**: (Recommended for production, not implemented in MVP)

## Scalability Considerations

### Current Architecture Supports

1. **Horizontal Scaling**: Stateless backend can be replicated
2. **Database Connection Pooling**: asyncpg handles connection management
3. **Caching Ready**: React Query caches client-side, Redis can be added server-side

### Future Scaling Options

1. **CDN**: Static frontend assets via CloudFront/CloudFlare
2. **Read Replicas**: PostgreSQL read replicas for query-heavy workloads
3. **Message Queue**: Redis/RabbitMQ for async AI generation tasks
4. **API Gateway**: Kong/AWS API Gateway for rate limiting, auth at edge

## Technology Rationale

| Choice | Rationale |
|--------|-----------|
| **FastAPI** | Modern, async-first, automatic OpenAPI docs, great DX |
| **React + Vite** | Fast HMR, TypeScript-first, large ecosystem |
| **PostgreSQL** | ACID compliance, JSON support, proven reliability |
| **SQLAlchemy 2.0** | Async support, type hints, industry standard ORM |
| **Pydantic** | Runtime validation, OpenAPI schema generation |
| **TanStack Query** | Powerful caching, background refetch, optimistic updates |
| **Tailwind CSS** | Utility-first, no CSS file management, consistent design |
| **Docker** | Consistent environments, easy local development |

## See Also

- [Backend Architecture](./BACKEND.md) - Detailed backend documentation
- [Frontend Architecture](./FRONTEND.md) - Detailed frontend documentation
- [API Documentation](./API.md) - Complete API reference
- [Key Decisions](./DECISIONS.md) - Architectural decision records
