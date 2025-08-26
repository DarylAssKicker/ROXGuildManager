import { Router } from 'express';
import { databaseController } from '../controllers/databaseController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get user ID from authenticated user
    if (!req.user?.id) {
      cb(new Error('User authentication required'), '');
      return;
    }
    
    const userId = req.user.id;
    let uploadPath: string;
    
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, userId, 'guild');
    } else if (process.env.NODE_ENV === 'production') {
      // Production: Docker maps uploads to client/public/images
      uploadPath = path.join(process.cwd(), 'client/public/images', userId, 'guild');
    } else {
      // Development: Use client/public/images directly
      uploadPath = path.join(__dirname, '../../../client/public/images', userId, 'guild');
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

// Configure multer for zip uploads
const zipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let tempPath: string;
    
    if (process.env.NODE_ENV === 'production') {
      // Production: Use client/public/temp
      tempPath = path.join(process.cwd(), 'client/public/temp');
    } else {
      // Development: Use client/public/temp directly
      tempPath = path.join(__dirname, '../../../client/public/temp');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `images-${uniqueSuffix}.zip`);
  }
});

const zipUpload = multer({
  storage: zipStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for zip files
  },
  fileFilter: (req, file, cb) => {
    // Only allow zip files
    if (file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
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

// Images management
router.get('/images/download', databaseController.downloadImages);
router.post('/images/upload', zipUpload.single('imagesZip'), databaseController.uploadImages);

// Guild name resource management
router.get('/guild-name', databaseController.getGuildNameResource);
router.post('/guild-name', databaseController.saveGuildNameResource);
router.put('/guild-name', databaseController.updateGuildNameResource);
router.delete('/guild-name', databaseController.deleteGuildNameResource);

// Data management (use with caution)
router.delete('/clear', databaseController.clearAll);

// Data export/import
router.get('/export', databaseController.exportAccountData);
router.post('/import', databaseController.clearAndImportData);

// Remove key expirations
router.post('/remove-expirations', databaseController.removeKeyExpirations);

export default router;