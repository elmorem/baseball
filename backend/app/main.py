"""FastAPI application entry point for Baseball Stats API."""

import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application lifespan events.

    Handles startup and shutdown events for database connections.

    Args:
        app: FastAPI application instance

    Yields:
        None
    """
    # Startup: Initialize database connection
    await init_db()
    print(f"✓ Database connection initialized")
    print(f"✓ {settings.APP_NAME} started successfully")

    yield

    # Shutdown: Close database connections
    await close_db()
    print(f"✓ Database connections closed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="A comprehensive API for managing baseball player statistics and AI-generated insights",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next) -> Response:
    """Add unique request ID to each request.

    Generates a unique UUID for each request and adds it to both
    the request state and response headers for tracking and debugging.

    Args:
        request: Incoming HTTP request
        call_next: Next middleware or route handler

    Returns:
        Response with X-Request-ID header
    """
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response


@app.get("/api/v1/health", tags=["Health"])
async def health_check() -> JSONResponse:
    """Health check endpoint.

    Returns the current status of the API and basic system information.

    Returns:
        JSONResponse with health status information

    Example:
        ```json
        {
            "status": "healthy",
            "service": "Baseball Stats API",
            "version": "0.1.0"
        }
        ```
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": "0.1.0",
        },
    )


@app.get("/", tags=["Root"])
async def root() -> JSONResponse:
    """Root endpoint with API information.

    Returns:
        JSONResponse with welcome message and documentation links
    """
    return JSONResponse(
        status_code=200,
        content={
            "message": f"Welcome to {settings.APP_NAME}",
            "docs": "/api/docs",
            "health": "/api/v1/health",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
