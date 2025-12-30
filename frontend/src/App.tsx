import { createBrowserRouter, Link, Outlet, RouterProvider, useRouteError } from 'react-router-dom';

/**
 * Root layout component with navigation
 */
function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Baseball Stats
              </Link>
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  Home
                </Link>
                <Link
                  to="/players"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  Players
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Home page component
 */
function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Welcome to Baseball Stats
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Track and analyze baseball player statistics with comprehensive data and insights.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900">Player Statistics</h3>
          <p className="mt-2 text-sm text-gray-600">
            View detailed statistics for all players including batting averages, home runs, and more.
          </p>
          <Link to="/players" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
            View Players →
          </Link>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900">Team Analytics</h3>
          <p className="mt-2 text-sm text-gray-600">
            Analyze team performance with advanced metrics and historical data.
          </p>
          <div className="mt-4 inline-block text-sm font-medium text-gray-400">
            Coming Soon
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900">Game Reports</h3>
          <p className="mt-2 text-sm text-gray-600">
            Access comprehensive game reports and play-by-play statistics.
          </p>
          <div className="mt-4 inline-block text-sm font-medium text-gray-400">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Login page component
 */
function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access Baseball Stats
          </p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input mt-1"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
                Forgot password?
              </a>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Players page component
 */
function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <button className="btn-primary">
          Add Player
        </button>
      </div>

      <div className="card">
        <p className="text-gray-600">
          Player list and statistics will be displayed here. This is a placeholder component
          that will be replaced with actual data fetching and display logic.
        </p>
      </div>
    </div>
  );
}

/**
 * Error boundary component for route errors
 */
function ErrorBoundary() {
  const error = useRouteError() as Error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-md text-center">
        <h1 className="text-6xl font-bold text-gray-900">Oops!</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700">Something went wrong</h2>
        <p className="mt-4 text-gray-600">
          {error?.message || 'An unexpected error occurred. Please try again later.'}
        </p>
        <Link to="/" className="btn-primary mt-6">
          Go back home
        </Link>
      </div>
    </div>
  );
}

/**
 * 404 Not Found page
 */
function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700">Page not found</h2>
        <p className="mt-4 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-block">
          Go back home
        </Link>
      </div>
    </div>
  );
}

/**
 * Application router configuration
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'players',
        element: <PlayersPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
