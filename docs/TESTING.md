# Testing Guide

## Overview

The Baseball Stats application uses a comprehensive testing strategy with three levels of tests:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test API endpoints and component interactions
3. **E2E Tests** - Test complete user workflows in a browser

## Test Pyramid

```
           ╱╲
          ╱  ╲         E2E Tests
         ╱    ╲        Slowest, most realistic
        ╱──────╲       ~29 scenarios
       ╱        ╲
      ╱          ╲     Integration Tests
     ╱────────────╲    API endpoints, component interactions
    ╱              ╲   ~50 tests
   ╱                ╲
  ╱──────────────────╲  Unit Tests
 ╱                    ╲ Fastest, most numerous
╱──────────────────────╲ ~70 tests
```

## Backend Testing

### Test Stack

| Tool | Version | Purpose |
|------|---------|---------|
| pytest | 8.3.3 | Test runner |
| pytest-asyncio | 0.24.0 | Async test support |
| pytest-cov | 5.0.0 | Code coverage |
| httpx | 0.27.2 | Async HTTP client for API tests |
| aiosqlite | 0.20.0 | In-memory SQLite for tests |

### Running Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/auth/test_security.py

# Run specific test class
pytest tests/auth/test_router.py::TestRegisterEndpoint

# Run specific test
pytest tests/auth/test_router.py::TestRegisterEndpoint::test_register_success

# Run with verbose output
pytest -v

# Run only failed tests from last run
pytest --lf
```

### Test Configuration (`pytest.ini`)

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

### Test Fixtures (`tests/conftest.py`)

#### Database Session Fixture

```python
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def async_engine():
    """Create async engine for each test."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for testing."""
    async_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session
```

#### Test Client Fixture

```python
@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with database override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
```

#### Test Data Fixtures

```python
@pytest.fixture
def test_user_data() -> dict:
    """Test user registration data."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123",
    }
```

### Test Categories

#### Unit Tests (`tests/auth/test_security.py`)

Test individual functions:

```python
class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_get_password_hash_returns_string(self):
        """Test that hashing returns a non-empty string."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_verify_password_correct(self):
        """Test verification with correct password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test verification with incorrect password."""
        password = "TestPassword123"
        hashed = get_password_hash(password)

        assert verify_password("WrongPassword", hashed) is False
```

#### Schema Tests (`tests/auth/test_schemas.py`)

Test Pydantic validation:

```python
class TestUserCreate:
    """Tests for UserCreate schema validation."""

    def test_valid_user_create(self):
        """Test valid user creation data."""
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="TestPass123",
        )
        assert user.email == "test@example.com"

    def test_username_too_short(self):
        """Test username minimum length validation."""
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@example.com",
                username="ab",  # Too short
                password="TestPass123",
            )

    def test_password_no_uppercase(self):
        """Test password requires uppercase letter."""
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="testpass123",  # No uppercase
            )
```

#### Integration Tests (`tests/auth/test_router.py`)

Test API endpoints:

```python
class TestRegisterEndpoint:
    """Tests for POST /auth/register endpoint."""

    @pytest.mark.asyncio
    async def test_register_success(
        self, client: AsyncClient, test_user_data: dict
    ):
        """Test successful user registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json=test_user_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["username"] == test_user_data["username"]
        assert "password" not in data  # Should not expose password

    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self, client: AsyncClient, test_user_data: dict
    ):
        """Test registration with existing email."""
        # Register first user
        await client.post("/api/v1/auth/register", json=test_user_data)

        # Try to register with same email
        response = await client.post(
            "/api/v1/auth/register",
            json=test_user_data,
        )

        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()
```

### Test Helpers

#### Creating Authenticated Requests

```python
async def get_auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict:
    """Helper to get auth headers for authenticated requests."""
    # Register user
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": "test", "password": password},
    )

    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Coverage

Generate coverage report:

```bash
# Generate HTML report
pytest --cov=app --cov-report=html

# View report
open htmlcov/index.html
```

**Coverage Targets:**

| Module | Target | Current |
|--------|--------|---------|
| auth | 90% | ~95% |
| players | 85% | ~88% |
| ai | 80% | ~75% |
| Overall | 85% | ~87% |

---

## Frontend Testing

### Test Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit test runner |
| React Testing Library | Component testing |
| @testing-library/jest-dom | DOM assertions |
| MSW | API mocking (optional) |

### Running Tests

```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific file
npm test src/hooks/useDebounce.test.ts
```

### Test Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Test Setup (`src/test/setup.ts`)

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### Unit Test Examples

#### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(250));

    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(250));

    // Should still be 'a' (timer reset)
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toBe('c');
  });
});
```

#### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from '../components/SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput placeholder="Search..." onChange={() => {}} />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onChange with input value', () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when has value', () => {
    render(
      <SearchInput placeholder="Search..." value="test" onChange={() => {}} />
    );

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });
});
```

#### Context Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock API
vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, isAuthenticated, login } = useAuth();

  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? 'logged-in' : 'logged-out'}
      </span>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  it('provides initial unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
  });
});
```

---

## E2E Testing with Playwright

### Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
      },
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run e2e

# Run in headed mode (visible browser)
npm run e2e -- --headed

# Run specific test file
npm run e2e -- e2e/auth.spec.ts

# Debug mode
npm run e2e -- --debug

# Generate tests with codegen
npx playwright codegen http://localhost:5173
```

### E2E Test Examples

#### Authentication Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to clear localStorage context
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to login when accessing protected route', async ({
    page,
  }) => {
    await page.goto('/players');
    await expect(page).toHaveURL('/login');
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show error for incorrect credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|error/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
```

#### Player Tests

```typescript
import { test, expect, Page } from '@playwright/test';

// Helper to set up auth state
async function loginAsTestUser(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token-for-e2e');
  });
}

test.describe('Player List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display player list page', async ({ page }) => {
    await page.goto('/players');
    await expect(
      page.getByRole('heading', { name: /players/i })
    ).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await page.goto('/players');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should filter players by search', async ({ page }) => {
    await page.goto('/players');

    await page.getByPlaceholder(/search/i).fill('Mike');
    await page.waitForTimeout(500); // Wait for debounce

    await expect(page).toHaveURL(/search=Mike/);
  });
});
```

### Visual Testing (Optional)

Add visual regression testing:

```typescript
test('player card visual', async ({ page }) => {
  await page.goto('/players/test-id');
  await expect(page.locator('.player-card')).toHaveScreenshot();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
jobs:
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
          POSTGRES_DB: test_db
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        run: pytest --cov=app --cov-report=xml

  frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test -- --run --coverage

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [frontend]
    continue-on-error: true  # Don't fail build on E2E failures

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run e2e
```

---

## Best Practices

### 1. Test Naming

```python
# Good: Descriptive, follows pattern
def test_register_with_duplicate_email_returns_400():

# Bad: Vague
def test_register():
```

### 2. Arrange-Act-Assert Pattern

```python
async def test_create_player_success(client, auth_headers):
    # Arrange
    player_data = {"name": "Test Player", "position": "CF"}

    # Act
    response = await client.post(
        "/api/v1/players",
        json=player_data,
        headers=auth_headers,
    )

    # Assert
    assert response.status_code == 201
    assert response.json()["name"] == "Test Player"
```

### 3. Test Isolation

- Each test should be independent
- Use fresh database for each test
- Clean up any side effects

### 4. Mock External Services

```python
# Mock OpenAI in AI tests
@pytest.fixture
def mock_openai(mocker):
    return mocker.patch(
        "app.ai.service.client.chat.completions.create",
        return_value=MockResponse(content="Generated description"),
    )
```

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Backend Documentation](./BACKEND.md)
- [Frontend Documentation](./FRONTEND.md)
