.PHONY: help setup install run dev test clean migrate migration docker-up docker-down docker-build format lint

# Default target
help:
	@echo "Baseball Stats API - Available Commands"
	@echo "========================================"
	@echo "make setup          - Run initial setup script"
	@echo "make install        - Install dependencies"
	@echo "make run            - Run the API server"
	@echo "make dev            - Run in development mode with auto-reload"
	@echo "make test           - Run tests with pytest"
	@echo "make migrate        - Apply database migrations"
	@echo "make migration      - Create new migration (use MSG='description')"
	@echo "make format         - Format code with black and isort"
	@echo "make lint           - Run type checking with mypy"
	@echo "make docker-build   - Build Docker image"
	@echo "make docker-up      - Start services with docker-compose"
	@echo "make docker-down    - Stop services with docker-compose"
	@echo "make clean          - Remove cache and temporary files"

setup:
	@bash scripts/setup.sh

install:
	@echo "Installing dependencies..."
	@pip install -r requirements.txt

run:
	@echo "Starting API server..."
	@uvicorn app.main:app --host 0.0.0.0 --port 8000

dev:
	@echo "Starting API server in development mode..."
	@uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

test:
	@echo "Running tests..."
	@pytest -v

migrate:
	@echo "Applying database migrations..."
	@alembic upgrade head

migration:
	@echo "Creating new migration: $(MSG)"
	@alembic revision --autogenerate -m "$(MSG)"

format:
	@echo "Formatting code..."
	@black app/ alembic/
	@isort app/ alembic/
	@echo "✓ Code formatted"

lint:
	@echo "Running type checking..."
	@mypy app/

docker-build:
	@echo "Building Docker image..."
	@docker build -t baseball-stats-api .

docker-up:
	@echo "Starting services with docker-compose..."
	@docker-compose up -d

docker-down:
	@echo "Stopping services..."
	@docker-compose down

clean:
	@echo "Cleaning cache and temporary files..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Cleaned"
