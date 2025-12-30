/**
 * Authentication types for the Baseball Stats application.
 */

/**
 * User object returned from API
 */
export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

/**
 * Token response from login/register
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Auth context state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth context value (state + actions)
 */
export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
