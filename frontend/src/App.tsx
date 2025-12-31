import { createBrowserRouter, Link, Outlet, RouterProvider, useRouteError } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage, RegisterPage } from './pages/auth';
import { PlayerListPage } from './pages/players';

/**
 * Navigation component with auth-aware links
 */
function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
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
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

/**
 * Root layout component with navigation
 */
function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
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
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'players',
        element: <PlayerListPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
