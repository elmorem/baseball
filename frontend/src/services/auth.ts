/**
 * Authentication API service.
 */

import { apiClient, tokenManager } from '../lib/api';
import type { LoginCredentials, RegisterData, TokenResponse, User } from '../types/auth';

const API_PREFIX = '/auth';

/**
 * Register a new user account.
 */
export async function register(data: RegisterData): Promise<User> {
  const response = await apiClient.post<User>(`${API_PREFIX}/register`, data);
  return response.data;
}

/**
 * Login with email and password.
 * Uses OAuth2 password flow (form data).
 */
export async function login(credentials: LoginCredentials): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  const response = await apiClient.post<TokenResponse>(`${API_PREFIX}/login`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const tokens = response.data;

  // Store tokens
  tokenManager.setToken(tokens.access_token);
  tokenManager.setRefreshToken(tokens.refresh_token);

  return tokens;
}

/**
 * Get current authenticated user.
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>(`${API_PREFIX}/me`);
  return response.data;
}

/**
 * Refresh access token.
 */
export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>(
    `${API_PREFIX}/refresh`,
    null,
    { params: { refresh_token: refreshToken } }
  );

  const tokens = response.data;

  // Update stored tokens
  tokenManager.setToken(tokens.access_token);
  tokenManager.setRefreshToken(tokens.refresh_token);

  return tokens;
}

/**
 * Logout user (clear tokens).
 */
export function logout(): void {
  tokenManager.clearTokens();
}

/**
 * Check if user has valid tokens stored.
 */
export function hasStoredTokens(): boolean {
  return !!tokenManager.getToken();
}
