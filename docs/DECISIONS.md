# Architectural Decisions and Tradeoffs

This document records significant architectural decisions made during the development of the Baseball Stats application, including the reasoning behind each choice and tradeoffs considered.

## Table of Contents

1. [Backend Framework: FastAPI](#1-backend-framework-fastapi)
2. [Database: PostgreSQL with SQLAlchemy](#2-database-postgresql-with-sqlalchemy)
3. [Authentication: JWT with Dual Tokens](#3-authentication-jwt-with-dual-tokens)
4. [Frontend Framework: React with Vite](#4-frontend-framework-react-with-vite)
5. [State Management: React Query](#5-state-management-react-query)
6. [Styling: Tailwind CSS](#6-styling-tailwind-css)
7. [Testing Strategy](#7-testing-strategy)
8. [AI Integration Approach](#8-ai-integration-approach)
9. [Containerization Strategy](#9-containerization-strategy)
10. [API Versioning](#10-api-versioning)

---

## 1. Backend Framework: FastAPI

### Decision
Use FastAPI as the Python web framework.

### Context
We needed a modern Python web framework that supports:
- Async/await for non-blocking I/O
- Automatic API documentation
- Strong type hints and validation
- High performance

### Options Considered

| Framework | Pros | Cons |
|-----------|------|------|
| **FastAPI** | Async-native, auto docs, Pydantic validation, modern | Newer ecosystem, fewer tutorials |
| Django REST | Mature, batteries-included, large community | Sync by default, heavier |
| Flask | Simple, flexible, large ecosystem | Manual validation, no auto docs |

### Decision Rationale
FastAPI was chosen because:
1. **Native async support** - Critical for database operations and external API calls
2. **Automatic OpenAPI docs** - Reduces documentation burden, self-documenting API
3. **Pydantic integration** - Type-safe request/response validation at runtime
4. **Modern Python** - Uses type hints throughout, better IDE support
5. **Performance** - One of the fastest Python frameworks available

### Tradeoffs
- Smaller community than Django/Flask (mitigated by growing adoption)
- Fewer third-party packages (most Flask/generic packages work)
- Team needs familiarity with async Python patterns

---

## 2. Database: PostgreSQL with SQLAlchemy

### Decision
Use PostgreSQL as the database with SQLAlchemy 2.0 ORM in async mode.

### Context
The application needs:
- Relational data with foreign key relationships
- Reliable ACID transactions
- Async database operations
- Type-safe query building

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL + SQLAlchemy** | Mature, full SQL support, great async | Heavier than SQLite |
| MongoDB + Motor | Schema flexibility, native async | Not ideal for relational data |
| SQLite + aiosqlite | Simple, no server needed | Limited concurrency, not for production |

### Decision Rationale
1. **PostgreSQL** - Production-ready, excellent JSON support, proven reliability
2. **SQLAlchemy 2.0** - Industry standard ORM with full async support
3. **asyncpg driver** - High-performance async PostgreSQL driver

### Tradeoffs
- Requires separate database server (Docker makes this manageable)
- More complex setup than SQLite for development
- SQLAlchemy has learning curve for complex queries

### Implementation Notes
```python
# We use NullPool because asyncpg handles its own connection pooling
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,
)
```

---

## 3. Authentication: JWT with Dual Tokens

### Decision
Implement JWT-based authentication with separate access and refresh tokens.

### Context
The application needs:
- Stateless authentication (no server-side sessions)
- Mobile-friendly auth flow
- Ability to invalidate sessions
- Token refresh without re-login

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **JWT dual tokens** | Stateless, standard, mobile-friendly | Token storage security, can't revoke |
| Session cookies | Simple, auto-revoke on logout | Server state, CSRF concerns |
| OAuth2 + third-party | Delegated auth, social login | Complex setup, external dependency |

### Decision Rationale
1. **Access tokens (15 min)** - Short-lived reduces exposure if compromised
2. **Refresh tokens (7 days)** - Long-lived for UX, only sent to refresh endpoint
3. **JTI (token ID)** - Unique per token, enables future revocation list
4. **Type claim** - Prevents using refresh token as access token

### Token Structure
```json
{
  "sub": "user-uuid",
  "exp": 1704067200,
  "type": "access",
  "jti": "unique-token-id"
}
```

### Tradeoffs
- Tokens can't be instantly revoked (mitigated by short access token lifetime)
- localStorage vulnerable to XSS (accepted risk with proper CSP headers)
- Refresh token rotation not implemented (future enhancement)

### Security Considerations
- bcrypt for password hashing (automatic salt, configurable work factor)
- Passwords validated for strength (uppercase, lowercase, digit required)
- Tokens signed with HS256 (sufficient for single-service apps)

---

## 4. Frontend Framework: React with Vite

### Decision
Use React 18 with Vite as the build tool and TypeScript for type safety.

### Context
The frontend needs:
- Component-based architecture
- Type safety
- Fast development iteration
- Production-ready builds

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **React + Vite** | Fast HMR, simple config, TypeScript | Newer tooling |
| Next.js | SSR, file routing, full-stack | Overkill for SPA, more complex |
| Vue + Vite | Simpler syntax, good docs | Smaller ecosystem |
| Create React App | Established, familiar | Slow, being deprecated |

### Decision Rationale
1. **React** - Largest ecosystem, team familiarity, abundant resources
2. **Vite** - Instant HMR, faster builds than CRA, native TypeScript
3. **TypeScript** - Catch errors at compile time, better refactoring

### Tradeoffs
- No SSR (fine for admin-style app, could add later)
- Client-side routing requires SPA-aware hosting
- Bundle size larger than framework-less approach

---

## 5. State Management: React Query

### Decision
Use TanStack Query (React Query) for server state management instead of Redux.

### Context
The application primarily deals with:
- Server data (players, user info)
- Caching API responses
- Background data synchronization
- Loading/error states

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **React Query** | Purpose-built for server state, caching | Learning curve for query keys |
| Redux + RTK Query | Familiar, global state | Boilerplate, overkill for server state |
| SWR | Simple, lightweight | Less features than React Query |
| Context + fetch | Simple, no dependencies | Manual caching, race conditions |

### Decision Rationale
1. **Automatic caching** - Prevents duplicate requests, configurable stale time
2. **Background refetch** - Data stays fresh without manual intervention
3. **Optimistic updates** - Can update UI before server confirms
4. **Query invalidation** - Structured approach to cache busting
5. **DevTools** - Excellent debugging experience

### Query Key Strategy
```typescript
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (filters) => [...playerKeys.lists(), filters] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id) => [...playerKeys.details(), id] as const,
};
```

### Tradeoffs
- Not suitable for complex client-side state (would add Zustand if needed)
- Query key management requires discipline
- Bundle size (~12KB gzipped)

---

## 6. Styling: Tailwind CSS

### Decision
Use Tailwind CSS utility classes for styling.

### Context
The application needs:
- Consistent design system
- Rapid UI development
- Responsive design
- Small bundle size

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS** | Utility-first, purged CSS, fast dev | Verbose class names |
| CSS Modules | Scoped styles, standard CSS | More files, manual design system |
| Styled Components | CSS-in-JS, dynamic styles | Runtime overhead, larger bundle |
| MUI/Chakra | Pre-built components | Opinionated, harder to customize |

### Decision Rationale
1. **Utility-first** - No context switching between files
2. **PurgeCSS built-in** - Only used classes in production (~10KB)
3. **Design constraints** - Spacing/color scales enforce consistency
4. **Responsive prefixes** - `md:`, `lg:` make responsive design trivial

### Tradeoffs
- HTML can look cluttered with many classes
- Need to learn utility class names
- No pre-built components (feature, not bug)

### Pattern Used
```tsx
// Component-specific styles via className composition
const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
};
```

---

## 7. Testing Strategy

### Decision
Implement three levels of testing: unit tests, integration tests, and E2E tests.

### Test Pyramid

```
        ╱╲
       ╱  ╲        E2E Tests (Playwright)
      ╱────╲       - Critical user flows
     ╱      ╲      - 29 scenarios
    ╱────────╲
   ╱          ╲    Integration Tests (pytest/Vitest)
  ╱────────────╲   - API endpoints
 ╱              ╲  - Component interactions
╱────────────────╲
        Unit Tests
   - Security functions
   - Schema validation
   - Hooks
```

### Backend Testing Stack

| Tool | Purpose |
|------|---------|
| pytest | Test runner |
| pytest-asyncio | Async test support |
| pytest-cov | Coverage reporting |
| httpx.AsyncClient | API testing |

### Frontend Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit tests, fast |
| React Testing Library | Component tests |
| Playwright | E2E tests |

### Tradeoffs
- E2E tests are slower (run with continue-on-error in CI)
- In-memory SQLite for tests differs slightly from PostgreSQL
- No visual regression testing (could add Chromatic/Percy)

---

## 8. AI Integration Approach

### Decision
Use OpenAI's API directly with async wrappers, storing generated content in the database.

### Context
The application needs:
- AI-generated player descriptions
- Non-blocking generation
- Content persistence
- Graceful degradation

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Direct OpenAI API** | Simple, full control | Vendor lock-in |
| LangChain | Abstraction, multiple providers | Over-engineered for simple use |
| Self-hosted LLM | No API costs, privacy | Infrastructure burden |

### Decision Rationale
1. **Simplicity** - Direct API is sufficient for generating descriptions
2. **Async wrapper** - `asyncio.to_thread()` prevents blocking
3. **Database storage** - Descriptions cached, regenerate on demand
4. **Token limits** - Capped at 150 tokens to control costs

### Implementation
```python
async def generate_description(player: Player) -> str:
    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
    )
    return response.choices[0].message.content
```

### Tradeoffs
- OpenAI dependency (could abstract to support other providers)
- API costs scale with usage
- No streaming support (could add for better UX)
- No fine-tuning (generic model is sufficient)

---

## 9. Containerization Strategy

### Decision
Use Docker with multi-stage builds and Docker Compose for local development.

### Container Architecture
```
┌─────────────────────────────────────────┐
│           docker-compose.yml            │
├─────────────────────────────────────────┤
│  frontend    │  backend   │  postgres   │
│  (nginx)     │  (uvicorn) │  (alpine)   │
│  Port 80     │  Port 8000 │  Port 5432  │
└─────────────────────────────────────────┘
```

### Multi-Stage Frontend Build
```dockerfile
# Stage 1: Dependencies
FROM node:20 AS base

# Stage 2: Development
FROM base AS development
CMD ["npm", "run", "dev"]

# Stage 3: Build
FROM base AS builder
RUN npm run build

# Stage 4: Production
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
```

### Tradeoffs
- Docker adds complexity for simple local development
- Build times increase with multi-stage
- Requires Docker knowledge for debugging

### Benefits
- Consistent environments across dev/staging/production
- Easy onboarding (single command to start)
- Production images are minimal (nginx + static files)

---

## 10. API Versioning

### Decision
Use URL path versioning with `/api/v1` prefix.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **URL path** `/api/v1` | Explicit, easy to route | URL pollution |
| Header `Accept-Version: v1` | Clean URLs | Hidden, hard to test |
| Query param `?version=1` | Explicit, flexible | Unconventional |

### Decision Rationale
1. **Explicit** - Version is visible in URL, easy to document
2. **Routing** - FastAPI router prefixes handle this naturally
3. **Caching** - Different versions have different URLs (CDN-friendly)
4. **Convention** - Most REST APIs use this approach

### Implementation
```python
app.include_router(auth_router, prefix="/api/v1")
app.include_router(players_router, prefix="/api/v1")
```

### Migration Strategy (Future)
When v2 is needed:
1. Create new routers under `/api/v2`
2. Mark v1 as deprecated in docs
3. Set sunset date for v1
4. Eventually remove v1 routers

---

## Future Considerations

Decisions explicitly deferred:

| Topic | Current State | Future Option |
|-------|---------------|---------------|
| Rate limiting | None | Redis + sliding window |
| Caching | React Query only | Redis server-side cache |
| Search | SQL LIKE | Elasticsearch/PostgreSQL FTS |
| File storage | Not implemented | S3/CloudFlare R2 |
| Notifications | Not implemented | WebSockets/SSE |
| Audit logging | Not implemented | Event sourcing pattern |

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Backend Documentation](./BACKEND.md)
- [Frontend Documentation](./FRONTEND.md)
