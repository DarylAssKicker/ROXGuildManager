import { Router } from 'express';
import aaController from '../controllers/aaController';
import { requirePermission } from '../middleware/permissionMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for AA image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { date } = req.params;
    
    if (!date) {
      cb(new Error('Date parameter is required'), '');
      return;
    }
    
    // Get user ID from authenticated user
    if (!req.user?.id) {
      cb(new Error('User authentication required'), '');
      return;
    }
    
    const userId = req.user.id;
    let uploadPath: string;
    
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, userId, 'AA', date);
    } else if (process.env.NODE_ENV === 'production') {
      // Production: Docker maps uploads to client/public/images
      uploadPath = path.join(process.cwd(), 'client/public/images', userId, 'AA', date);
    } else {
      // Development: Use client/public/images directly
      uploadPath = path.join(__dirname, '../../../client/public/images', userId, 'AA', date);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `aa_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Import AA data (create permission required)
router.post('/import', requirePermission('aa', 'create'), aaController.importAAData);

// Get AA data for specific date (read permission required)
router.get('/date/:date', requirePermission('aa', 'read'), aaController.getAADataByDate);

// Get AA data within date range (read permission required)
router.get('/range', requirePermission('aa', 'read'), aaController.getAADataByDateRange);

// Get all AA data date list (read permission required)
router.get('/dates', requirePermission('aa', 'read'), aaController.getAllAADates);

// Delete AA data for specific date (delete permission required)
router.delete('/date/:date', requirePermission('aa', 'delete'), aaController.deleteAAData);

// Get AA data statistics (read permission required)
router.get('/statistics', requirePermission('aa', 'read'), aaController.getAAStatistics);

// Get AA image list for specific date (read permission required)
router.get('/images/:date', requirePermission('aa', 'read'), aaController.getAAImages);

// Upload AA images for specific date (create permission required)
router.post('/images/:date/upload', requirePermission('aa', 'create'), upload.array('images', 10), aaController.uploadAAImages);

// Delete AA image by filename (delete permission required)
router.delete('/images/:date/:filename', requirePermission('aa', 'delete'), aaController.deleteAAImage);

// Get member's AA participation status (read permission required)
router.get('/member/:memberName/participation', requirePermission('aa', 'read'), aaController.getMemberAAParticipation);

// Get all members' AA participation status (read permission required)
router.get('/members/participation', requirePermission('aa', 'read'), aaController.getAllMembersAAParticipation);

// Get specific members' AA participation status (read permission required)
router.post('/members/participation', requirePermission('aa', 'read'), aaController.getMembersAAParticipation);

export default router;