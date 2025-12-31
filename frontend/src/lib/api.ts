import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * API Error structure for consistent error handling
 */
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/**
 * Token storage keys
 */
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Token management utilities
 */
export const tokenManager = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * Configure API base URL from environment
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor: Add authorization token
   */
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenManager.getToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor: Handle common errors and token refresh
   */
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized errors
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Attempt to refresh token
          const refreshToken = tokenManager.getRefreshToken();

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // TODO: Implement actual token refresh endpoint
          // For now, this is a placeholder
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;

          // Update stored tokens
          tokenManager.setToken(access_token);
          if (newRefreshToken) {
            tokenManager.setRefreshToken(newRefreshToken);
          }

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          tokenManager.clearTokens();

          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        }
      }

      // Handle other error types
      const apiError: ApiError = {
        message: error.response?.data?.message || error.message || 'An unexpected error occurred',
        status: error.response?.status,
        errors: error.response?.data?.errors,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

/**
 * Singleton API client instance
 */
export const apiClient = createApiClient();

/**
 * Type-safe API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}

/**
 * Generic API request methods with type safety
 */
export const api = {
  get: <T>(url: string, config = {}) =>
    apiClient.get<ApiResponse<T>>(url, config).then((res) => res.data),

  post: <T, D = unknown>(url: string, data?: D, config = {}) =>
    apiClient.post<ApiResponse<T>>(url, data, config).then((res) => res.data),

  put: <T, D = unknown>(url: string, data?: D, config = {}) =>
    apiClient.put<ApiResponse<T>>(url, data, config).then((res) => res.data),

  patch: <T, D = unknown>(url: string, data?: D, config = {}) =>
    apiClient.patch<ApiResponse<T>>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config = {}) =>
    apiClient.delete<ApiResponse<T>>(url, config).then((res) => res.data),
};

/**
 * Health check endpoint for testing API connectivity
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
};

export default apiClient;
