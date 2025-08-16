import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { User } from '../types';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT authentication middleware
 */
export const authenticateToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied, valid token required'
      });
      return;
    }

    const payload = await authService.verifyToken(token);
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({
      success: false,
      error: 'Token is invalid or expired'
    });
  }
};

/**
 * Role verification middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Admin permission verification middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Optional authentication middleware (for optional login endpoints)
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const payload = await authService.verifyToken(token);
        const user = await authService.getUserById(payload.userId);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Don't throw error when token is invalid, just don't set user info
        console.log('Optional auth token verification failed:', error);
      }
    }

    next();
  } catch (error) {
    // Continue execution when optional auth fails
    console.error('Optional auth middleware error:', error);
    next();
  }
};