import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// ==================== Public Authentication Routes ====================

// User login
router.post('/login', authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// ==================== Authenticated Routes ====================

// User logout
router.post('/logout', authenticateToken, authController.logout);

// Get current user info
router.get('/me', authenticateToken, authController.getCurrentUser);

// Change password
router.post('/change-password', authenticateToken, authController.changePassword);

// ==================== Admin Function Routes ====================

// Get all users
router.get('/users', authenticateToken, requireAdmin, authController.getAllUsers);

// Create user
router.post('/users', authenticateToken, requireAdmin, authController.createUser);

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, authController.updateUser);

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, authController.deleteUser);

export default router;