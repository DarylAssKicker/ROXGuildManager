import axios, { AxiosResponse } from 'axios';
import { LoginForm, LoginResponse, User, ApiResponse } from '../types';

// API base URL
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || '/api';

// Authentication related API service
class AuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Restore token from localStorage
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
    
    // Set axios default headers
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Set response interceptor to handle token expiration
    this.setupInterceptors();
  }

  /**
   * Set authentication header
   */
  private setAuthHeader(token: string): void {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication header
   */
  private clearAuthHeader(): void {
    delete axios.defaults.headers.common['Authorization'];
  }

  /**
   * Set response interceptor
   */
  private setupInterceptors(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 error and not login or refresh token request, try to refresh token
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes('/auth/login') &&
          !originalRequest.url.includes('/auth/refresh') &&
          this.refreshToken
        ) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshTokens();
            if (newTokens) {
              // Reset auth header and retry original request
              this.setAuthHeader(newTokens.token);
              originalRequest.headers['Authorization'] = `Bearer ${newTokens.token}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Refresh token failed, clear auth info
            this.clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * User login
   */
  async login(loginData: LoginForm): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<ApiResponse<LoginResponse>> = await axios.post(
        `${API_BASE_URL}/auth/login`,
        loginData
      );

      if (response.data.success && response.data.data) {
        const { token, refreshToken, user } = response.data.data;
        
        // Save token to memory and localStorage
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set auth header
        this.setAuthHeader(token);
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh token
   */
  async refreshTokens(): Promise<LoginResponse | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response: AxiosResponse<ApiResponse<LoginResponse>> = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: this.refreshToken }
      );

      if (response.data.success && response.data.data) {
        const { token, refreshToken, user } = response.data.data;
        
        // Update token
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Token refresh failed');
      }
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(`${API_BASE_URL}/auth/logout`);
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Clear authentication information
   */
  private clearAuth(): void {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.clearAuthHeader();
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await axios.get(
        `${API_BASE_URL}/auth/me`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get user information');
      }
    } catch (error: any) {
      console.error('Failed to get user information:', error);
      return null;
    }
  }

  /**
   * Get stored user information
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse stored user information:', error);
      return null;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<null>> = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Password change failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Password change failed';
      throw new Error(errorMessage);
    }
  }
}

// Create and export auth service instance
export const authService = new AuthService();
export default authService;