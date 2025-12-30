# Baseball Stats Application

A full-stack web application for viewing and managing baseball player statistics with AI-generated player descriptions.

## Features

- **Player List**: Browse all players with search, sort (by hits/HRs), and pagination
- **Player Details**: View comprehensive statistics for each player
- **AI Descriptions**: Generate LLM-powered player descriptions using OpenAI
- **Edit Players**: Authenticated users can modify player statistics
- **Authentication**: JWT-based auth with secure token refresh

## Tech Stack

### Backend
- **FastAPI** (Python 3.11+) - Async REST API
- **SQLAlchemy 2.0** - Async ORM with PostgreSQL
- **Alembic** - Database migrations
- **Pydantic v2** - Data validation
- **JWT** - Authentication tokens

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Server state management
- **Tailwind CSS** - Styling
- **React Router v6** - Routing

### Infrastructure
- **PostgreSQL 16** - Database
- **Docker Compose** - Container orchestration
- **Nginx** - Frontend serving

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key (for AI descriptions)

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd baseball
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Generate a secure secret key:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   # Add the output to SECRET_KEY in .env
   ```

4. **Start the application:**
   ```bash
   docker-compose up --build
   ```

5. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - API Docs: http://localhost:8001/api/docs

### Development Setup

For local development without Docker:

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
baseball/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # Database setup
│   │   └── models/           # SQLAlchemy models
│   ├── alembic/              # Database migrations
│   ├── tests/                # Backend tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Root component
│   │   └── lib/              # Utilities
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Invalidate tokens

### Players
- `GET /api/v1/players` - List players (search, sort, pagination)
- `GET /api/v1/players/{id}` - Get player details
- `PUT /api/v1/players/{id}` - Update player (auth required)
- `POST /api/v1/players/import` - Import from external API

### Descriptions
- `GET /api/v1/players/{id}/descriptions` - Get cached descriptions
- `POST /api/v1/players/{id}/descriptions` - Generate new description

### Health
- `GET /api/v1/health` - Health check with DB status

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key (32+ chars) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `DATABASE_URL` | PostgreSQL connection URL | Yes (local only) |
| `ALLOWED_ORIGINS` | CORS allowed origins | No |

## Testing

**Backend:**
```bash
cd backend
pytest --cov=app tests/
```

**Frontend:**
```bash
cd frontend
npm test
```

**E2E:**
```bash
cd frontend
npm run test:e2e
```

## License

MIT
