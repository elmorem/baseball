"""Database connection and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings


def get_engine() -> AsyncEngine:
    """Create and configure the async SQLAlchemy engine.

    Returns:
        AsyncEngine: Configured async database engine
    """
    # Use NullPool for async engines (connection pooling is handled by asyncpg)
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        poolclass=NullPool,
        pool_pre_ping=True,  # Verify connections before using them
    )

    return engine


# Create global engine instance
engine: AsyncEngine = get_engine()

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions.

    Yields:
        AsyncSession: Database session for the request

    Example:
        @app.get("/players")
        async def get_players(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Player))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database connection.

    This function should be called during application startup.
    """
    # Test the connection
    async with engine.begin() as conn:
        # You can add any initialization logic here
        pass


async def close_db() -> None:
    """Close database connections.

    This function should be called during application shutdown.
    """
    await engine.dispose()
