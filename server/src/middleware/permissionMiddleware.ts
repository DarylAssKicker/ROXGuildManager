import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { User } from '../types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Permission check middleware factory
 * @param resource - Resource name (e.g., 'aa', 'gvg', 'guild_members')
 * @param action - Action name (e.g., 'read', 'create', 'update', 'delete')
 */
export function requirePermission(resource: string, action: 'read' | 'create' | 'update' | 'delete') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Please login first'
        });
      }
      
      // Check permission
      if (!authService.hasPermission(user, resource, action)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `You don't have permission to ${action} ${resource}`,
          required: { resource, action },
          userRole: user.role
        });
      }
      
      return next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Owner-only middleware - only allows admin and owner roles
 */
export function requireOwner() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Please login first'
        });
      }
      
      if (user.role !== 'admin' && user.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: 'Owner access required',
          message: 'Only account owners can perform this action',
          userRole: user.role
        });
      }
      
      return next();
    } catch (error) {
      console.error('Owner check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Helper function to get data user ID from request user
 */
export function getDataUserId(req: Request): string {
  const user = req.user;
  if (!user) {
    throw new Error('User not found in request');
  }
  return authService.getDataUserId(user);
}