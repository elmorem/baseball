# Baseball Stats API - Quick Start Guide

Get up and running with the Baseball Stats API in minutes.

## Prerequisites

- Python 3.12+
- PostgreSQL 14+ (or Docker)
- OpenAI API Key

## Option 1: Quick Start with Docker (Recommended)

### 1. Create Environment File

```bash
cd backend
cp .env.example .env
```

### 2. Edit `.env` and Add Your API Keys

```bash
# Generate a secure SECRET_KEY
python3 scripts/generate_secret_key.py

# Add to .env:
SECRET_KEY=<generated-key>
OPENAI_API_KEY=sk-your-key-here
```

### 3. Start Everything with Docker Compose

```bash
docker-compose up
```

That's it! The API is now running at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/api/docs
- **Health**: http://localhost:8000/api/v1/health

## Option 2: Local Development Setup

### 1. Run Setup Script

```bash
cd backend
bash scripts/setup.sh
```

This will:
- Create virtual environment
- Install dependencies
- Generate `.env` file with SECRET_KEY

### 2. Add Your OpenAI API Key

Edit `.env` and add:
```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Start PostgreSQL

```bash
# Option A: Using Docker
docker-compose up db

# Option B: Using local PostgreSQL
# Make sure it's running on port 5432
```

### 4. Run Database Migrations

```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head
```

### 5. Start the API

```bash
# Development mode with auto-reload
make dev

# Or directly with uvicorn
uvicorn app.main:app --reload
```

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Root endpoint
curl http://localhost:8000/
```

### Using the Interactive Docs

Open http://localhost:8000/api/docs in your browser for full API documentation with interactive testing.

## Common Commands

```bash
# Using Make
make help           # Show all available commands
make dev            # Run in development mode
make migrate        # Apply database migrations
make format         # Format code with Black and isort
make test           # Run tests
make clean          # Clean cache files

# Direct Commands
uvicorn app.main:app --reload     # Start dev server
alembic upgrade head               # Apply migrations
alembic revision --autogenerate    # Create new migration
black app/ alembic/                # Format code
pytest                             # Run tests
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings & configuration
│   ├── database.py          # Database connection
│   └── models/              # SQLAlchemy models
│       ├── user.py
│       ├── player.py
│       └── player_description.py
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
├── scripts/
│   ├── setup.sh             # Setup script
│   └── generate_secret_key.py
├── docker-compose.yml       # Docker Compose config
├── Dockerfile              # Docker build
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables
```

## Database Models

### User
- Authentication and user management
- Fields: email, username, hashed_password, is_active

### Player
- Comprehensive baseball statistics
- 14 stat fields including BA, OBP, SLG, OPS
- Indexed for performance

### PlayerDescription
- AI-generated player descriptions
- Tracks tokens and costs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint with API info |
| GET | `/api/v1/health` | Health check |
| GET | `/api/docs` | Interactive API documentation |
| GET | `/api/redoc` | ReDoc documentation |

## Environment Variables

Required:
- `SECRET_KEY` - JWT secret (generate with `scripts/generate_secret_key.py`)
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - PostgreSQL connection URL

Optional:
- `ALLOWED_ORIGINS` - CORS origins (default: localhost:3000,localhost:8000)
- `DEBUG` - Debug mode (default: false)
- `DB_POOL_SIZE` - Connection pool size (default: 5)

## Troubleshooting

### "Connection refused" Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env

### "Module not found" Error
- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Migration Errors
- Reset database: `alembic downgrade base && alembic upgrade head`
- Check database connection

### Port Already in Use
- Change port: `uvicorn app.main:app --port 8001`
- Or kill existing process: `lsof -ti:8000 | xargs kill`

## Next Steps

1. **Add More Endpoints**: Create routers for players, users, etc.
2. **Implement Authentication**: Add JWT token endpoints
3. **Add Tests**: Create test suite with pytest
4. **Set Up CI/CD**: Configure GitHub Actions
5. **Deploy**: Deploy to cloud platform (AWS, GCP, Azure)

## Getting Help

- **Documentation**: See `README.md` for detailed docs
- **API Docs**: Visit http://localhost:8000/api/docs
- **Issues**: Check the repository issues page

## Security Checklist

- [ ] Changed SECRET_KEY from default
- [ ] Added OPENAI_API_KEY
- [ ] Configured ALLOWED_ORIGINS for your domain
- [ ] Using strong PostgreSQL password
- [ ] Never committed .env to git
- [ ] Using HTTPS in production

---

You're ready to go! Start building your baseball stats application.
