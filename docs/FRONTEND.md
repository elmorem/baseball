# Frontend Architecture

## Overview

The frontend is a React Single Page Application (SPA) built with TypeScript and Vite. It provides a modern, responsive interface for managing baseball player statistics with real-time data synchronization via React Query.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| React Router | 6.x | Client-side routing |
| TanStack Query | 5.x | Server state management |
| Axios | 0.27.x | HTTP client |
| Tailwind CSS | 3.x | Utility-first CSS |

## Project Structure

```
frontend/src/
├── main.tsx                 # Application entry point
├── App.tsx                  # Root component with routing
├── index.css                # Global styles & Tailwind imports
├── vite-env.d.ts           # Vite type declarations
│
├── components/              # Reusable UI components
│   ├── Layout.tsx          # Page layout wrapper
│   ├── Header.tsx          # Navigation header
│   ├── ProtectedRoute.tsx  # Auth guard component
│   ├── PlayerCard.tsx      # Player display card
│   ├── PlayerForm.tsx      # Create/edit player form
│   ├── PlayerTable.tsx     # Players data table
│   ├── SearchInput.tsx     # Search with debounce
│   ├── Pagination.tsx      # Page navigation
│   └── LoadingSpinner.tsx  # Loading indicator
│
├── pages/                   # Page components (routes)
│   ├── LoginPage.tsx       # User login
│   ├── RegisterPage.tsx    # User registration
│   ├── PlayersPage.tsx     # Player list view
│   ├── PlayerDetailPage.tsx # Single player view
│   ├── PlayerEditPage.tsx  # Edit player form
│   └── PlayerNewPage.tsx   # Create player form
│
├── contexts/                # React Context providers
│   └── AuthContext.tsx     # Authentication state
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts          # Auth context consumer
│   ├── usePlayers.ts       # Player data queries
│   └── useDebounce.ts      # Input debouncing
│
├── lib/                     # Utilities and services
│   ├── api.ts              # Axios instance & interceptors
│   └── queryClient.ts      # React Query configuration
│
└── types/                   # TypeScript type definitions
    ├── auth.ts             # Auth-related types
    └── player.ts           # Player-related types
```

## Core Concepts

### Authentication Context (`contexts/AuthContext.tsx`)

Provides global authentication state management:

```tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user } = response.data;

    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setUser(user);
  };

  // ... logout, register, refreshToken implementations

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Key Features:**
- Persists tokens in localStorage
- Automatic token refresh on API 401 responses
- Loading state during initial auth check
- Clean logout with token cleanup

### API Client (`lib/api.ts`)

Axios instance with request/response interceptors:

```tsx
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem('auth_token', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Design Decisions:**
- Automatic Bearer token injection
- Transparent token refresh on 401
- Redirect to login on refresh failure
- Configurable base URL via environment variable

### React Query Integration (`hooks/usePlayers.ts`)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys for cache management
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (filters: PlayerFilters) => [...playerKeys.lists(), filters] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
};

// Fetch players with filtering
export function usePlayers(filters: PlayerFilters = {}) {
  return useQuery({
    queryKey: playerKeys.list(filters),
    queryFn: () => fetchPlayers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single player
export function usePlayer(id: string) {
  return useQuery({
    queryKey: playerKeys.detail(id),
    queryFn: () => fetchPlayer(id),
    enabled: !!id,
  });
}

// Create player mutation
export function useCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlayer,
    onSuccess: () => {
      // Invalidate and refetch player lists
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
    },
  });
}

// Update player mutation
export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlayerUpdate }) =>
      updatePlayer(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific player and lists
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
    },
  });
}

// Delete player mutation
export function useDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
    },
  });
}
```

**Benefits:**
- Structured query keys for precise cache invalidation
- Automatic background refetching
- Optimistic updates possible
- Loading/error states built-in

### Protected Routes (`components/ProtectedRoute.tsx`)

```tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**Usage in Routes:**

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Protected routes */}
  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route path="/players" element={<PlayersPage />} />
    <Route path="/players/new" element={<PlayerNewPage />} />
    <Route path="/players/:id" element={<PlayerDetailPage />} />
    <Route path="/players/:id/edit" element={<PlayerEditPage />} />
  </Route>
</Routes>
```

## Component Patterns

### Form Handling

Using controlled components with validation:

```tsx
interface PlayerFormProps {
  initialData?: Player;
  onSubmit: (data: PlayerCreate | PlayerUpdate) => void;
  isLoading?: boolean;
}

export function PlayerForm({ initialData, onSubmit, isLoading }: PlayerFormProps) {
  const [formData, setFormData] = useState<PlayerFormData>({
    name: initialData?.name || '',
    position: initialData?.position || '',
    games: initialData?.games || 0,
    batting_average: initialData?.batting_average || 0,
    home_runs: initialData?.home_runs || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.position) {
      newErrors.position = 'Position is required';
    }
    if (formData.batting_average < 0 || formData.batting_average > 1) {
      newErrors.batting_average = 'Must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Player Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`mt-1 block w-full rounded-md border ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      {/* ... other fields ... */}

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update Player' : 'Create Player'}
      </button>
    </form>
  );
}
```

### Data Table with Sorting and Filtering

```tsx
interface PlayerTableProps {
  players: Player[];
  onSort: (column: string) => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export function PlayerTable({
  players,
  onSort,
  sortColumn,
  sortDirection,
}: PlayerTableProps) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'position', label: 'Position' },
    { key: 'games', label: 'Games' },
    { key: 'batting_average', label: 'AVG' },
    { key: 'home_runs', label: 'HR' },
  ];

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              {col.label}
              {sortColumn === col.key && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {players.map((player) => (
          <tr key={player.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
              <Link
                to={`/players/${player.id}`}
                className="text-blue-600 hover:underline"
              >
                {player.name}
              </Link>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{player.position}</td>
            <td className="px-6 py-4 whitespace-nowrap">{player.games}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              {player.batting_average.toFixed(3)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{player.home_runs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Search with Debounce

```tsx
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in PlayersPage
function PlayersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: players, isLoading } = usePlayers({
    search: debouncedSearch,
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-4 py-2"
      />
      {/* ... */}
    </div>
  );
}
```

## Styling with Tailwind CSS

### Configuration (`tailwind.config.js`)

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
```

### Component Styling Patterns

```tsx
// Button variants using Tailwind
const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded font-medium transition-colors ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

## Type Definitions (`types/`)

### Auth Types

```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
```

### Player Types

```typescript
export interface Player {
  id: string;
  name: string;
  position: string;
  games: number;
  at_bats: number;
  hits: number;
  home_runs: number;
  batting_average: number;
  created_at: string;
  updated_at: string;
  description?: PlayerDescription;
}

export interface PlayerCreate {
  name: string;
  position: string;
  games?: number;
  at_bats?: number;
  hits?: number;
  home_runs?: number;
  batting_average?: number;
}

export interface PlayerUpdate extends Partial<PlayerCreate> {}

export interface PlayerFilters {
  search?: string;
  position?: string;
  page?: number;
  limit?: number;
}

export interface PlayerDescription {
  id: string;
  content: string;
  created_at: string;
}
```

## Testing

### Unit Tests with Vitest

```tsx
// Example test for useDebounce hook
import { renderHook, act } from '@testing-library/react';
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
});
```

### E2E Tests with Playwright

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Player List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Set mock auth token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
    });
  });

  test('should display player list page', async ({ page }) => {
    await page.goto('/players');
    await expect(page.getByRole('heading', { name: /players/i })).toBeVisible();
  });

  test('should filter players by search', async ({ page }) => {
    await page.goto('/players');
    await page.getByPlaceholder(/search/i).fill('Mike');
    await page.waitForTimeout(500); // Wait for debounce
    await expect(page).toHaveURL(/search=Mike/);
  });
});
```

## Build Configuration

### Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Testing Guide](./TESTING.md)
