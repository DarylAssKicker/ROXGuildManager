import { Router } from 'express';
import { databaseController } from '../controllers/databaseController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Support environment variable configuration for upload path
    let uploadPath: string;
    
    if (process.env.UPLOAD_PATH) {
      uploadPath = process.env.UPLOAD_PATH;
    } else if (process.env.NODE_ENV === 'production') {
      // Production environment: use client directory under working directory
      uploadPath = path.join(process.cwd(), 'client/public/images');
    } else {
      // Development environment: use path relative to source code
      uploadPath = path.join(__dirname, '../../../client/public/images');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `guild-bg-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// Database status and health check
router.get('/status', databaseController.getStatus);
router.post('/initialize', databaseController.initialize);

// Guild member data management
router.get('/guilds', databaseController.getAllGuildIds);
router.get('/guilds/:guildId/members', databaseController.getGuildMembers);
router.post('/guilds/:guildId/members', databaseController.saveGuildMembers);
router.delete('/guilds/:guildId/members', databaseController.deleteGuildMembers);
router.put('/guilds/:guildId/members/:memberName', databaseController.updateGuildMember);

// Guild name resource management
router.post('/guild-names', databaseController.createGuildNameResource);
router.get('/guild-names', databaseController.getAllGuildNameResources);
router.get('/guild-names/:guildId', databaseController.getGuildNameResource);
router.put('/guild-names/:guildId', databaseController.updateGuildNameResource);
router.delete('/guild-names/:guildId', databaseController.deleteGuildNameResource);

// OCRResult
router.post('/ocr/:sessionId', databaseController.saveOCRResult);
router.get('/ocr/:sessionId', databaseController.getOCRResult);

// Cache management
router.post('/cache/:key', databaseController.setCache);
router.get('/cache/:key', databaseController.getCache);
router.delete('/cache/:key', databaseController.deleteCache);

// File upload
router.post('/upload/background', upload.single('backgroundImage'), databaseController.uploadBackgroundImage);

// Guild name resource management
router.get('/guild-name', databaseController.getGuildNameResource);
router.post('/guild-name', databaseController.saveGuildNameResource);
router.put('/guild-name', databaseController.updateGuildNameResource);
router.delete('/guild-name', databaseController.deleteGuildNameResource);

// Data management (use with caution)
router.delete('/clear', databaseController.clearAll);

export default router;