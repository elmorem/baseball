# Deployment Guide

## Overview

This guide covers deployment options for the Baseball Stats application, from local development to production environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Considerations](#production-considerations)
4. [Environment Configuration](#environment-configuration)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring and Logging](#monitoring-and-logging)

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

The easiest way to run the full stack locally:

```bash
# Clone the repository
git clone https://github.com/your-org/baseball.git
cd baseball

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Services:**
| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React development server |
| Backend | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/api/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Database |

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/baseball"
export SECRET_KEY="your-secret-key-at-least-32-chars"
export OPENAI_API_KEY="sk-..."

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env.local

# Start development server
npm run dev
```

---

## Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: baseball
      POSTGRES_PASSWORD: ${DB_PASSWORD:-baseball}
      POSTGRES_DB: baseball
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U baseball"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      target: production
    environment:
      DATABASE_URL: postgresql+asyncpg://baseball:${DB_PASSWORD:-baseball}@postgres:5432/baseball
      SECRET_KEY: ${SECRET_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ALLOWED_ORIGINS: '["http://localhost:5173", "http://localhost:80"]'
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      target: production
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development target
FROM base AS development
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production target
FROM base AS production
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Development target
FROM deps AS development
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build target
FROM deps AS builder
COPY . .
RUN npm run build

# Production target
FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

---

## Production Considerations

### Security Checklist

- [ ] **HTTPS only** - Use TLS certificates (Let's Encrypt)
- [ ] **Strong SECRET_KEY** - Generate with `openssl rand -hex 32`
- [ ] **Database credentials** - Use strong passwords, rotate regularly
- [ ] **CORS origins** - Restrict to your domains only
- [ ] **Rate limiting** - Add API rate limits
- [ ] **SQL injection** - Already protected via SQLAlchemy ORM
- [ ] **XSS protection** - React escapes by default, CSP headers recommended
- [ ] **Dependency updates** - Regular security updates

### Environment Variables (Production)

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:password@db-host:5432/baseball_prod
SECRET_KEY=<generated-64-char-hex>
OPENAI_API_KEY=sk-prod-...
ALLOWED_ORIGINS='["https://your-domain.com"]'
DEBUG=false

# Frontend (build-time)
VITE_API_URL=https://api.your-domain.com/api/v1
```

### Database

#### Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

#### Backups

```bash
# Backup
pg_dump -U baseball baseball_prod > backup_$(date +%Y%m%d).sql

# Restore
psql -U baseball baseball_prod < backup_20240115.sql
```

### Scaling

#### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
    # ... rest of config

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

#### Load Balancer (Nginx)

```nginx
upstream backend {
    least_conn;
    server backend:8000 weight=1;
    # Add more servers as needed
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

---

## Environment Configuration

### Backend Settings

```python
# app/config.py
class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Baseball Stats API"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    # OpenAI
    OPENAI_API_KEY: str | None = None

    # CORS
    ALLOWED_ORIGINS: list[str] = Field(default_factory=list)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
```

### Frontend Environment

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    ),
  },
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          target: production
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          target: production
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        # Add your deployment steps here
        # e.g., SSH to server, kubectl apply, etc.
        run: echo "Deploy to production"
```

---

## Monitoring and Logging

### Structured Logging

```python
# app/logging_config.py
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

### Health Checks

```python
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint for load balancers."""
    return {
        "status": "healthy",
        "service": "Baseball Stats API",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/v1/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness check - includes database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(503, detail=f"Database unavailable: {str(e)}")
```

### Metrics (Optional)

Add Prometheus metrics:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# In main.py
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

### Recommended Monitoring Stack

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Visualization |
| Loki | Log aggregation |
| AlertManager | Alerting |

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check connection
docker compose exec postgres psql -U baseball -c "SELECT 1"

# Check logs
docker compose logs postgres
```

#### Frontend Can't Reach Backend

```bash
# Check CORS configuration
curl -I -X OPTIONS http://localhost:8000/api/v1/health \
  -H "Origin: http://localhost:5173"

# Check backend is responding
curl http://localhost:8000/api/v1/health
```

#### Docker Build Issues

```bash
# Clean build
docker compose build --no-cache

# Remove all containers and volumes
docker compose down -v
docker system prune -a
```

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [API Documentation](./API.md)
