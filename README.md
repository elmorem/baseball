# Baseball Stats Application

A full-stack web application for viewing and managing baseball player statistics with AI-generated player descriptions.

[![CI](https://github.com/elmorem/baseball/actions/workflows/ci.yml/badge.svg)](https://github.com/elmorem/baseball/actions/workflows/ci.yml)

## Features

- **Player Management**: Full CRUD operations for baseball player statistics
- **Search & Filter**: Browse players with search, position filter, and sorting
- **AI Descriptions**: Generate LLM-powered player descriptions using OpenAI
- **Authentication**: JWT-based auth with secure token refresh
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** (Python 3.12) - Async REST API
- **SQLAlchemy 2.0** - Async ORM with PostgreSQL
- **Alembic** - Database migrations
- **Pydantic v2** - Data validation
- **JWT** - Authentication tokens
- **OpenAI** - AI description generation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Server state management
- **Tailwind CSS** - Styling
- **React Router v6** - Routing

### Testing
- **Backend**: pytest with async support
- **Frontend**: Vitest + React Testing Library
- **E2E**: Playwright

### Infrastructure
- **PostgreSQL 16** - Database
- **Docker Compose** - Container orchestration
- **Nginx** - Frontend serving
- **GitHub Actions** - CI/CD

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key (optional, for AI descriptions)

### Setup

1. **Clone and navigate to the project:**
   ```bash
   git clone https://github.com/elmorem/baseball.git
   cd baseball
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY (optional)
   ```

3. **Generate a secure secret key:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   # Add the output to SECRET_KEY in .env
   ```

4. **Start the application:**
   ```bash
   docker compose up --build
   ```

5. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/docs

## Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Development with Docker

Use the dev profile for hot-reload and testing capabilities:

```bash
# Start with dev frontend
docker compose --profile dev up

# Access dev frontend at http://localhost:5173
```

### Running Tests

**Backend tests:**
```bash
cd backend
uv run pytest -v
```

**Frontend unit tests:**
```bash
cd frontend
npm test
```

**Frontend E2E tests:**
```bash
cd frontend
npx playwright install chromium
npm run e2e
```

**All tests in Docker:**
```bash
# Unit tests
docker compose --profile dev exec frontend-dev npm test

# E2E tests
docker compose --profile dev exec frontend-dev npm run e2e
```

## Project Structure

```
baseball/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       └── deploy.yml          # Deployment pipeline
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI application
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # Database setup
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── routers/            # API routes
│   ├── tests/                  # Backend tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── contexts/           # React contexts
│   │   ├── pages/              # Page components
│   │   ├── services/           # API clients
│   │   └── types/              # TypeScript types
│   ├── e2e/                    # Playwright E2E tests
│   ├── src/test/               # Test utilities
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate tokens |

### Players
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/players` | List players (search, sort, pagination) |
| POST | `/api/v1/players` | Create player (auth required) |
| GET | `/api/v1/players/{id}` | Get player details |
| PUT | `/api/v1/players/{id}` | Update player (auth required) |
| DELETE | `/api/v1/players/{id}` | Delete player (auth required) |
| POST | `/api/v1/players/{id}/description` | Generate AI description |
| POST | `/api/v1/players/import` | Import from external API |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check with DB status |

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | JWT signing key (32+ chars) | Yes | - |
| `DATABASE_URL` | PostgreSQL connection URL | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | `*` |

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline** (`ci.yml`): Runs on all PRs and pushes to main
  - Backend: Linting (Ruff, Black), type checking (mypy), tests (pytest)
  - Frontend: Linting (ESLint), type checking (tsc), unit tests (Vitest)
  - E2E: Playwright tests
  - Build: Docker image build verification

- **Deploy Pipeline** (`deploy.yml`): Runs on pushes to main and tags
  - Builds and pushes Docker images to GitHub Container Registry

## License

MIT
