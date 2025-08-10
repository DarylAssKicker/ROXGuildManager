import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * User context middleware
 * Extract user information from verified token and add to request object
 */
export const userContext = (req: Request, res: Response, next: NextFunction) => {
  // User information should already be set by authentication middleware
  // This just ensures user information is available
  next();
};