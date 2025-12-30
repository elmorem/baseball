# Baseball Stats API Backend

A production-ready FastAPI backend for managing baseball player statistics with AI-generated insights.

## Features

- **FastAPI Framework**: Modern, fast, async web framework
- **SQLAlchemy 2.0**: Async ORM with comprehensive type hints
- **PostgreSQL**: Robust relational database with async support
- **Alembic**: Database migrations with version control
- **OpenAI Integration**: AI-generated player descriptions
- **JWT Authentication**: Secure user authentication
- **CORS Support**: Configurable cross-origin resource sharing
- **Docker Ready**: Multi-stage Dockerfile for production deployment
- **Type Safety**: Comprehensive type hints throughout

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Pydantic Settings configuration
│   ├── database.py                # SQLAlchemy async engine setup
│   └── models/
│       ├── __init__.py
│       ├── base.py                # Base model with mixins
│       ├── user.py                # User authentication model
│       ├── player.py              # Player statistics model
│       └── player_description.py  # AI-generated descriptions
├── alembic/
│   ├── env.py                     # Alembic async environment
│   └── versions/
│       └── 001_initial_schema.py  # Initial database schema
├── alembic.ini                    # Alembic configuration
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Multi-stage Docker build
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## Prerequisites

- Python 3.12+
- PostgreSQL 14+
- Docker (optional, for containerized deployment)

## Quick Start

### 1. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Update SECRET_KEY and OPENAI_API_KEY
```

### 2. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb baseball

# Run migrations
alembic upgrade head
```

### 4. Run the Application

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **Health Check**: http://localhost:8000/api/v1/health

## Docker Deployment

### Build and Run with Docker

```bash
# Build the image
docker build -t baseball-stats-api .

# Run the container
docker run -d \
  --name baseball-api \
  -p 8000:8000 \
  --env-file .env \
  baseball-stats-api
```

### Using Docker Compose (recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: baseball
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

volumes:
  postgres_data:
```

Then run:

```bash
docker-compose up -d
```

## Database Migrations

### Create a New Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Create empty migration
alembic revision -m "Description of changes"
```

### Apply Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade to specific revision
alembic upgrade <revision_id>

# Downgrade one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>
```

### View Migration History

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic history --verbose
```

## API Endpoints

### Health Check

```http
GET /api/v1/health
```

Returns API health status.

### Root

```http
GET /
```

Returns API information and documentation links.

## Database Models

### User

- Authentication and authorization
- Fields: id, email, username, hashed_password, is_active
- Timestamps: created_at, updated_at

### Player

- Comprehensive baseball statistics
- Counting stats: games, at_bats, runs, hits, doubles, triples, home_runs, rbis, walks, strikeouts, stolen_bases, caught_stealing
- Rate stats: batting_average, on_base_percentage, slugging_percentage, ops
- Timestamps: created_at, updated_at
- Indexes: player_name, hits DESC, home_runs DESC, batting_average DESC

### PlayerDescription

- AI-generated player descriptions
- Tracks model usage and costs
- Fields: player_id (FK), content, model_used, tokens_used, cost_usd
- Timestamp: created_at

## Configuration

All configuration is managed through environment variables in `.env`:

### Required Variables

- `DATABASE_URL`: PostgreSQL connection URL
- `SECRET_KEY`: JWT secret key (minimum 32 characters)
- `OPENAI_API_KEY`: OpenAI API key

### Optional Variables

- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `DEBUG`: Debug mode (true/false)
- `APP_NAME`: Application name
- `DB_POOL_SIZE`: Database connection pool size
- `DB_MAX_OVERFLOW`: Maximum overflow connections
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration

## Development

### Code Quality Tools

```bash
# Format code with Black
black app/ alembic/

# Sort imports with isort
isort app/ alembic/

# Type checking with mypy
mypy app/

# Run all formatters
black app/ alembic/ && isort app/ alembic/
```

### Testing

```bash
# Run tests with pytest
pytest

# With coverage
pytest --cov=app --cov-report=html

# Async tests
pytest -v tests/
```

## Security Considerations

1. **SECRET_KEY**: Generate a strong secret key using:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Environment Variables**: Never commit `.env` files to version control

3. **Database Credentials**: Use strong passwords and restrict access

4. **CORS**: Configure `ALLOWED_ORIGINS` to only include trusted domains

5. **HTTPS**: Always use HTTPS in production

## Performance Optimization

- **Connection Pooling**: Configured with optimal pool sizes
- **Async Operations**: Full async/await support throughout
- **Database Indexes**: Optimized indexes on frequently queried fields
- **Query Optimization**: Use of `selectin` loading for relationships

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Test database connection
psql -h localhost -U postgres -d baseball
```

### Migration Issues

```bash
# Reset database (WARNING: destroys all data)
alembic downgrade base
alembic upgrade head
```

### Import Errors

```bash
# Ensure you're in the backend directory
cd backend

# Activate virtual environment
source venv/bin/activate
```

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on the repository.
