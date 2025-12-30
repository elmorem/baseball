#!/bin/bash
# Setup script for Baseball Stats API backend

set -e

echo "================================"
echo "Baseball Stats API - Setup"
echo "================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Check if PostgreSQL is running (optional for Docker users)
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "✓ PostgreSQL is running"
    else
        echo "⚠ PostgreSQL is not running (you can use Docker instead)"
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

# Upgrade pip
echo
echo "Upgrading pip..."
pip install --upgrade pip
echo "✓ pip upgraded"

# Install dependencies
echo
echo "Installing dependencies..."
pip install -r requirements.txt
echo "✓ Dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo
    echo "Creating .env file from template..."
    cp .env.example .env

    # Generate SECRET_KEY
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

    # Replace SECRET_KEY in .env (works on both Linux and macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
    else
        # Linux
        sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
    fi

    echo "✓ .env file created with generated SECRET_KEY"
    echo
    echo "⚠ IMPORTANT: Edit .env and add your OPENAI_API_KEY"
else
    echo
    echo "✓ .env file already exists"
fi

echo
echo "================================"
echo "Setup complete!"
echo "================================"
echo
echo "Next steps:"
echo "1. Edit .env and add your OPENAI_API_KEY"
echo "2. Start PostgreSQL (or use docker-compose up db)"
echo "3. Run migrations: alembic upgrade head"
echo "4. Start the API: uvicorn app.main:app --reload"
echo
echo "Or use Docker Compose:"
echo "  docker-compose up"
echo
echo "API will be available at:"
echo "  - http://localhost:8000"
echo "  - http://localhost:8000/api/docs (Interactive docs)"
echo
