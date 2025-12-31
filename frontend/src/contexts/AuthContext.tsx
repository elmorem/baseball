/**
 * Authentication context provider for managing user auth state.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import * as authService from '../services/auth';
import type { AuthContextValue, AuthState, LoginCredentials, RegisterData } from '../types/auth';

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * Auth context with default undefined value
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth context provider component.
 * Manages authentication state and provides auth methods.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Load user on mount if tokens exist
   */
  useEffect(() => {
    async function loadUser() {
      if (!authService.hasStoredTokens()) {
        updateState({ isLoading: false });
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        updateState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token invalid or expired
        authService.logout();
        updateState({ isLoading: false });
      }
    }

    loadUser();
  }, [updateState]);

  /**
   * Login handler
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    updateState({ isLoading: true, error: null });

    try {
      await authService.login(credentials);
      const user = await authService.getCurrentUser();

      updateState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      updateState({
        error: message,
        isLoading: false,
      });
      throw err;
    }
  }, [updateState]);

  /**
   * Register handler
   */
  const register = useCallback(async (data: RegisterData) => {
    updateState({ isLoading: true, error: null });

    try {
      // Register creates user but doesn't auto-login
      await authService.register(data);

      // Auto-login after registration
      await authService.login({ email: data.email, password: data.password });
      const user = await authService.getCurrentUser();

      updateState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      updateState({
        error: message,
        isLoading: false,
      });
      throw err;
    }
  }, [updateState]);

  /**
   * Logout handler
   */
  const logout = useCallback(() => {
    authService.logout();
    updateState({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  }, [updateState]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Memoized context value
   */
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      clearError,
    }),
    [state, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * Must be used within AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * HOC to protect routes requiring authentication.
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
      return null;
    }

    return <Component {...props} />;
  };
}
