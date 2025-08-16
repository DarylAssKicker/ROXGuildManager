import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest,
  CreateUserRequest,
  UpdateUserRequest,
  User
} from '../types';

class AuthController {
  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      
      // Validate required fields
      if (!loginData.username || !loginData.password) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Username and password cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const result = await authService.login(loginData);
      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: result,
        message: 'Login successful'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Login failed:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
      res.status(401).json(response);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshData: RefreshTokenRequest = req.body;
      
      if (!refreshData.refreshToken) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Refresh token cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const result = await authService.refreshToken(refreshData);
      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: result,
        message: 'Token refresh successful'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Token refresh failed:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
      res.status(401).json(response);
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Unauthenticated user',
        };
        res.status(401).json(response);
        return;
      }

      await authService.logout(req.user.id);
      const response: ApiResponse<null> = {
        success: true,
        message: 'Logout successful'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Logout failed:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Logout failed',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Unauthenticated user',
        };
        res.status(401).json(response);
        return;
      }

      const user = await authService.getUserById(req.user.id);
      if (!user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User does not exist',
        };
        res.status(404).json(response);
        return;
      }

      // Don't return password hash
      const userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      };

      const response: ApiResponse<typeof userInfo> = {
        success: true,
        data: userInfo
      };
      
      res.json(response);
    } catch (error) {
      console.error('Failed to get user info:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get user information',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create user (admin function)
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;
      
      // Validate required fields
      if (!userData.username || !userData.password) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Username and password cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      // Password length validation
      if (userData.password.length < 6) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Password must be at least 6 characters',
        };
        res.status(400).json(response);
        return;
      }

      const user = await authService.createUser(userData);
      
      // Don't return password hash
      const userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      };

      const response: ApiResponse<typeof userInfo> = {
        success: true,
        data: userInfo,
        message: 'User created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Failed to create user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get all users (admin function)
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await authService.getAllUsers();
      
      // Don't return password hash
      const usersInfo = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }));

      const response: ApiResponse<typeof usersInfo> = {
        success: true,
        data: usersInfo
      };
      
      res.json(response);
    } catch (error) {
      console.error('Failed to get user list:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get user list',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update user (admin function)
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData: UpdateUserRequest = req.body;

      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      // Password length validation
      if (userData.password && userData.password.length < 6) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Password must be at least 6 characters',
        };
        res.status(400).json(response);
        return;
      }

      const user = await authService.updateUser(id, userData);
      
      // Don't return password hash
      const userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        updatedAt: user.updatedAt
      };

      const response: ApiResponse<typeof userInfo> = {
        success: true,
        data: userInfo,
        message: 'User updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Failed to update user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete user (admin function)
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      // Cannot delete yourself
      if (req.user && req.user.id === id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Cannot delete your own account',
        };
        res.status(400).json(response);
        return;
      }

      await authService.deleteUser(id);

      const response: ApiResponse<null> = {
        success: true,
        message: 'User deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Failed to delete user:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Unauthenticated user',
        };
        res.status(401).json(response);
        return;
      }

      if (!currentPassword || !newPassword) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Current password and new password cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      if (newPassword.length < 6) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'New password must be at least 6 characters',
        };
        res.status(400).json(response);
        return;
      }

      // Validate current password
      const loginResult = await authService.login({
        username: req.user.username,
        password: currentPassword
      });

      // Update password
      await authService.updateUser(req.user.id, {
        password: newPassword
      });

      const response: ApiResponse<null> = {
        success: true,
        message: 'Password changed successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Failed to change password:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password',
      };
      res.status(400).json(response);
    }
  }
}

export const authController = new AuthController();