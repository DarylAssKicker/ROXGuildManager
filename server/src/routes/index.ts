import { Router } from 'express';
import multer from 'multer';
import guildController from '../controllers/guildController';
import screenshotController from '../controllers/screenshotController';
import databaseRoutes from './database';
import aaRoutes from './aa';
import gvgRoutes from './gvg';
import kvmRoutes from './kvm';
import templateRoutes from './template';
import classRoutes from './classRoutes';
import groupPartyRoutes from './groupParty';
import authRoutes from './auth';
import subAccountRoutes from './subAccount';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Guild member related routes (authentication and permission required)
router.get('/guild/members', authenticateToken, requirePermission('guild_members', 'read'), guildController.getMembers);
router.get('/guild/members/search', authenticateToken, requirePermission('guild_members', 'read'), guildController.searchMembers);
router.get('/guild/members/class/:className', authenticateToken, requirePermission('guild_members', 'read'), guildController.getMembersByClass);
router.get('/guild/members/:id', authenticateToken, requirePermission('guild_members', 'read'), guildController.getMember);
router.post('/guild/members', authenticateToken, requirePermission('guild_members', 'create'), guildController.createMember);
router.put('/guild/members/:id', authenticateToken, requirePermission('guild_members', 'update'), guildController.updateMember);
router.delete('/guild/members/:id', authenticateToken, requirePermission('guild_members', 'delete'), guildController.deleteMember);
router.delete('/guild/members', authenticateToken, requirePermission('guild_members', 'delete'), guildController.deleteAllMembers);
router.post('/guild/members/batch', authenticateToken, requirePermission('guild_members', 'update'), guildController.batchUpdateMembers);

// Guild info related routes (authentication required)
router.get('/guild/info', authenticateToken, guildController.getGuildInfo);
router.put('/guild/info', authenticateToken, guildController.updateGuildInfo);

// Screenshot recognition related routes (supports single and multiple file upload, authentication required)
const uploadFields = upload.fields([
  { name: 'screenshot', maxCount: 1 },      // Single file upload field
    { name: 'screenshots', maxCount: 10 }     // Multiple file upload field
]);
router.post('/screenshot/analyze', authenticateToken, uploadFields, screenshotController.analyzeScreenshot.bind(screenshotController));
router.get('/screenshot/history', authenticateToken, screenshotController.getHistory.bind(screenshotController));
router.delete('/screenshot/history', authenticateToken, screenshotController.clearHistory.bind(screenshotController));
router.get('/screenshot/statistics', authenticateToken, screenshotController.getStatistics.bind(screenshotController));

// OCR service related routes (authentication required)
router.get('/ocr/status', authenticateToken, screenshotController.getOCRStatus.bind(screenshotController));
router.post('/ocr/reinitialize', authenticateToken, screenshotController.reinitializeOCR.bind(screenshotController));

// Sub-route modules (authentication required)
router.use('/database', authenticateToken, databaseRoutes);

// AA related routes (authentication required)
router.use('/aa', authenticateToken, aaRoutes);

// GVG related routes (authentication required)
router.use('/gvg', authenticateToken, gvgRoutes);

// KVM related routes (authentication required)
router.use('/kvm', authenticateToken, kvmRoutes);

// Template related routes (shared data, authentication required)
router.use('/templates', authenticateToken, templateRoutes);

// Job related routes (shared data, authentication required)
router.use('/classes', authenticateToken, classRoutes);

// Group and party related routes (authentication required)
router.use('/group-party', authenticateToken, groupPartyRoutes);

// Authentication related routes
router.use('/auth', authRoutes);

// Sub-account management routes (authentication required)
router.use('/sub-accounts', authenticateToken, subAccountRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ROXGuildManager health check ok',
    timestamp: new Date().toISOString(),
    services: {
      guild: 'active',
      screenshot: 'active',
      ocr: 'active',
      database: 'active',
      aa: 'active',
      gvg: 'active',
      kvm: 'active',
      templates: 'active'
    }
  });
});

export default router;