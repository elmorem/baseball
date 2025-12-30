# Baseball Stats Frontend

Modern React + TypeScript + Vite frontend application for baseball statistics tracking and analysis.

## Tech Stack

- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query v5** - Server state management
- **Axios** - HTTP client
- **TailwindCSS** - Utility-first CSS framework
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running (default: http://localhost:8000)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types
```

## Project Structure

```
src/
├── lib/              # Core utilities and configurations
│   └── api.ts       # Axios client with interceptors
├── main.tsx         # Application entry point
├── App.tsx          # Router configuration
├── index.css        # Global styles and Tailwind
└── test/
    └── setup.ts     # Test configuration
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Baseball Stats
VITE_ENABLE_ANALYTICS=false
```

## API Client

The application includes a fully configured Axios client with:

- Automatic Bearer token injection from localStorage
- Token refresh on 401 errors
- Type-safe API methods
- Consistent error handling
- Request/response interceptors

Example usage:

```typescript
import { api } from '@/lib/api';

// GET request
const { data } = await api.get<Player[]>('/players');

// POST request
const { data } = await api.post<Player>('/players', { name: 'John Doe' });
```

## Authentication

The app includes token management utilities:

```typescript
import { tokenManager } from '@/lib/api';

// Store tokens
tokenManager.setToken('access_token');
tokenManager.setRefreshToken('refresh_token');

// Get tokens
const token = tokenManager.getToken();

// Clear tokens (logout)
tokenManager.clearTokens();
```

## Docker Deployment

### Development

```bash
docker build -t baseball-stats-frontend .
docker run -p 80:80 baseball-stats-frontend
```

### Production

```bash
# Build with environment variables
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_APP_NAME="Baseball Stats" \
  -t baseball-stats-frontend:prod .

# Run
docker run -d -p 80:80 baseball-stats-frontend:prod
```

## Testing

The project uses Vitest and React Testing Library for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Code Quality

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting (configure in your editor)
- **Path Aliases**: Use `@/` prefix for imports from `src/`

## Performance Optimizations

- Code splitting with React.lazy and Suspense
- Route-based code splitting
- React Query for efficient data caching
- Memoization strategies for expensive computations
- Optimized production builds with Vite
- Static asset caching via nginx
- Gzip compression

## Accessibility

- Semantic HTML structure
- ARIA labels and roles where needed
- Keyboard navigation support
- Focus management
- Color contrast compliance

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Contributing

1. Create a feature branch from `main`
2. Make your changes with proper TypeScript types
3. Write tests for new functionality
4. Ensure all tests pass: `npm run test`
5. Check types: `npm run type-check`
6. Run linter: `npm run lint`
7. Submit a pull request

## License

MIT
