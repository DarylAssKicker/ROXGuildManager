import { Router } from 'express';
import aaController from '../controllers/aaController';
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
    
    let uploadPath: string;
    
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, 'AA', date);
    } else if (process.env.NODE_ENV === 'production') {
      uploadPath = path.join(process.cwd(), 'client/public/images/AA', date);
    } else {
      uploadPath = path.join(__dirname, '../../../client/public/images/AA', date);
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

// Import AA data
router.post('/import', aaController.importAAData);

// Get AA data for specific date
router.get('/date/:date', aaController.getAADataByDate);

// Get AA data within date range
router.get('/range', aaController.getAADataByDateRange);

// Get all AA data date list
router.get('/dates', aaController.getAllAADates);

// Delete AA data for specific date
router.delete('/date/:date', aaController.deleteAAData);

// Get AA data statistics
router.get('/statistics', aaController.getAAStatistics);

// Get AA image list for specific date
router.get('/images/:date', aaController.getAAImages);

// Upload AA images for specific date
router.post('/images/:date/upload', upload.array('images', 10), aaController.uploadAAImages);

// Get member's AA participation status
router.get('/member/:memberName/participation', aaController.getMemberAAParticipation);

// Get all members' AA participation status (batch)
router.get('/members/participation', aaController.getAllMembersAAParticipation);

// Get specific members' AA participation status (batch)
router.post('/members/participation', aaController.getMembersAAParticipation);

export default router;