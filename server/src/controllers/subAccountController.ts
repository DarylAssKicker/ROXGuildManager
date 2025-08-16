import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { CreateSubAccountRequest } from '../types';

class SubAccountController {
  /**
   * Create sub-account
   */
  async createSubAccount(req: Request<{}, {}, CreateSubAccountRequest>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { username, password, role, permissions } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Please provide username, password, and role'
        });
      }

      if (role !== 'editor' && role !== 'viewer') {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Sub-account role must be editor or viewer'
        });
      }

      const subAccount = await authService.createSubAccount(req.user.id, {
        username,
        password,
        role,
        permissions: permissions || undefined
      });

      return res.status(201).json({
        success: true,
        data: {
          id: subAccount.id,
          username: subAccount.username,
          role: subAccount.role,
          permissions: subAccount.permissions,
          createdAt: subAccount.createdAt
        },
        message: 'Sub-account created successfully'
      });
    } catch (error) {
      console.error('Failed to create sub-account:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create sub-account',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all sub-accounts for current user
   */
  async getSubAccounts(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const subAccounts = await authService.getSubAccounts(req.user.id);

      const safeSubAccounts = subAccounts.map(account => ({
        id: account.id,
        username: account.username,
        role: account.role,
        permissions: account.permissions,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt
      }));

      return res.status(200).json({
        success: true,
        data: safeSubAccounts,
        message: `Found ${safeSubAccounts.length} sub-accounts`
      });
    } catch (error) {
      console.error('Failed to get sub-accounts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get sub-accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update sub-account
   */
  async updateSubAccount(req: Request<{ id: string }>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { id } = req.params;
      const { password, role, permissions } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing sub-account ID',
          message: 'Please provide sub-account ID'
        });
      }

      // Check if sub-account belongs to current user
      const subAccounts = await authService.getSubAccounts(req.user.id);
      const targetSubAccount = subAccounts.find(account => account.id === id);
      
      if (!targetSubAccount) {
        return res.status(404).json({
          success: false,
          error: 'Sub-account not found',
          message: 'Sub-account not found or you don\'t have permission to modify it'
        });
      }

      // Validate role if provided
      if (role && role !== 'editor' && role !== 'viewer') {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Sub-account role must be editor or viewer'
        });
      }

      const updatedAccount = await authService.updateUser(id, {
        password,
        role,
        permissions
      });

      return res.status(200).json({
        success: true,
        data: {
          id: updatedAccount.id,
          username: updatedAccount.username,
          role: updatedAccount.role,
          permissions: updatedAccount.permissions,
          updatedAt: updatedAccount.updatedAt
        },
        message: 'Sub-account updated successfully'
      });
    } catch (error) {
      console.error('Failed to update sub-account:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update sub-account',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete sub-account
   */
  async deleteSubAccount(req: Request<{ id: string }>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing sub-account ID',
          message: 'Please provide sub-account ID'
        });
      }

      // Check if sub-account belongs to current user
      const subAccounts = await authService.getSubAccounts(req.user.id);
      const targetSubAccount = subAccounts.find(account => account.id === id);
      
      if (!targetSubAccount) {
        return res.status(404).json({
          success: false,
          error: 'Sub-account not found',
          message: 'Sub-account not found or you don\'t have permission to delete it'
        });
      }

      await authService.deleteUser(id);

      return res.status(200).json({
        success: true,
        message: 'Sub-account deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete sub-account:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete sub-account',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current user's permissions
   */
  async getCurrentUserPermissions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const user = req.user;
      const hasFullAccess = user.role === 'admin' || user.role === 'owner';

      return res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions || [],
          hasFullAccess,
          parentUserId: user.parentUserId,
          guildDataUserId: user.guildDataUserId
        }
      });
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user permissions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new SubAccountController();