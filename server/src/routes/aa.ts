import { Router } from 'express';
import aaController from '../controllers/aaController';

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

// Get member's AA participation status
router.get('/member/:memberName/participation', aaController.getMemberAAParticipation);

export default router;