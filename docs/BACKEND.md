# Backend Architecture

## Overview

The backend is built with FastAPI, a modern Python web framework designed for building APIs with automatic interactive documentation. It uses SQLAlchemy 2.0 for async database operations and follows a modular architecture with clear separation of concerns.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | 0.115.0 | Web framework |
| SQLAlchemy | 2.0.35 | ORM (async mode) |
| asyncpg | 0.29.0 | PostgreSQL async driver |
| Pydantic | 2.9.2 | Data validation |
| python-jose | 3.3.0 | JWT token handling |
| passlib | 1.7.4 | Password hashing |
| OpenAI | 1.51.2 | AI integration |

## Module Architecture

### Application Entry Point (`app/main.py`)

```python
# Lifespan management for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # Initialize database connection
    yield
    await close_db()  # Close connections on shutdown

app = FastAPI(
    title="Baseball Stats API",
    lifespan=lifespan,
)

# Middleware configuration
app.add_middleware(CORSMiddleware, ...)

# Router registration
app.include_router(auth_router, prefix="/api/v1")
app.include_router(players_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
```

**Key Features:**
- Async context manager for lifespan events
- CORS middleware for cross-origin requests
- Request ID middleware for request tracing
- Modular router registration

### Authentication Module (`app/auth/`)

#### Security Utilities (`security.py`)

```python
# Password hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**JWT Token Strategy:**

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Token renewal |

```python
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({
        "exp": expire,
        "type": "access",
        "jti": str(uuid4()),  # Unique token ID
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
```

#### Dependencies (`dependencies.py`)

FastAPI dependencies for authentication:

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate user from JWT token."""
    payload = verify_token(token, expected_type=ACCESS_TOKEN_TYPE)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user

# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveUser = Annotated[User, Depends(get_current_active_user)]
```

#### Schemas (`schemas.py`)

Pydantic models with validation:

```python
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must be alphanumeric")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain lowercase")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain digit")
        return v
```

### Players Module (`app/players/`)

#### Repository Pattern (`repository.py`)

```python
class PlayerRepository:
    """Encapsulates all database operations for players."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        position: str | None = None,
    ) -> list[Player]:
        """Get players with optional filtering."""
        query = select(Player)

        if search:
            query = query.where(Player.name.ilike(f"%{search}%"))
        if position:
            query = query.where(Player.position == position)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, player_data: PlayerCreate) -> Player:
        """Create a new player."""
        player = Player(**player_data.model_dump())
        self.db.add(player)
        await self.db.commit()
        await self.db.refresh(player)
        return player
```

**Repository Benefits:**
- Centralized database logic
- Easier testing with mocks
- Clear API boundary
- Reusable query patterns

#### CSV Import Feature

```python
@router.post("/import")
async def import_players_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Import players from CSV file."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "File must be CSV")

    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode()))

    # Validate required columns
    required = {'name', 'position'}
    if not required.issubset(df.columns):
        raise HTTPException(400, f"Missing columns: {required - set(df.columns)}")

    # Batch insert
    players = [Player(**row) for row in df.to_dict('records')]
    db.add_all(players)
    await db.commit()

    return {"imported": len(players)}
```

### AI Module (`app/ai/`)

#### OpenAI Integration (`service.py`)

```python
class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_player_description(self, player: Player) -> str:
        """Generate AI description for a player."""
        prompt = f"""
        Generate a brief, engaging description for this baseball player:
        Name: {player.name}
        Position: {player.position}
        Stats: {player.games} games, {player.batting_average} AVG, {player.home_runs} HR

        Write 2-3 sentences highlighting their strengths and playing style.
        """

        response = await asyncio.to_thread(
            self.client.chat.completions.create,
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
        )

        return response.choices[0].message.content
```

**Design Decisions:**
- `asyncio.to_thread()` for non-blocking OpenAI calls
- Structured prompts for consistent output
- Token limits to control costs

### Database Layer (`app/database.py`)

#### Async Engine Configuration

```python
def get_engine() -> AsyncEngine:
    """Create async SQLAlchemy engine."""
    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        poolclass=NullPool,  # asyncpg handles pooling
        pool_pre_ping=True,  # Verify connections
    )

engine = get_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
```

#### Session Dependency

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Models (`app/models/`)

#### Base Model

```python
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass
```

#### User Model

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

#### Player Model with Relationships

```python
class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    position: Mapped[str] = mapped_column(String(50))

    # Statistics
    games: Mapped[int] = mapped_column(Integer, default=0)
    at_bats: Mapped[int] = mapped_column(Integer, default=0)
    hits: Mapped[int] = mapped_column(Integer, default=0)
    home_runs: Mapped[int] = mapped_column(Integer, default=0)
    batting_average: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationship to AI descriptions
    descriptions: Mapped[list["PlayerDescription"]] = relationship(
        back_populates="player",
        cascade="all, delete-orphan",
    )
```

### Configuration (`app/config.py`)

```python
class Settings(BaseSettings):
    """Application settings from environment variables."""

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
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

## Error Handling

### Custom Exception Handlers

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
        },
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )
```

### Standard Error Response Format

```json
{
    "detail": "Error message here",
    "code": "ERROR_CODE",
    "field": "field_name"  // For validation errors
}
```

## Testing Strategy

### Test Configuration (`tests/conftest.py`)

```python
# In-memory SQLite for fast tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_session(async_engine):
    """Create isolated database session per test."""
    async with async_session() as session:
        yield session

@pytest.fixture
async def client(db_session):
    """Test client with database override."""
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

### Test Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Unit Tests | `tests/auth/test_security.py` | Password hashing, JWT functions |
| Schema Tests | `tests/auth/test_schemas.py` | Pydantic validation |
| Integration Tests | `tests/auth/test_router.py` | API endpoint behavior |
| Repository Tests | `tests/players/test_repository.py` | Database operations |

## Performance Considerations

### Async All the Way

- All database operations use `async/await`
- OpenAI calls wrapped in `asyncio.to_thread()`
- No blocking I/O in request handlers

### Database Optimization

- Indexed columns for common queries (email, username, player name)
- Pagination on list endpoints
- Eager loading for relationships when needed

### Connection Management

- `NullPool` lets asyncpg handle connection pooling
- `pool_pre_ping` prevents stale connections
- Proper session cleanup in finally blocks

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Testing Guide](./TESTING.md)
