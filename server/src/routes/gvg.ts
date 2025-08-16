import { Router } from 'express';
import gvgController from '../controllers/gvgController';

const router = Router();

// Import GVG data
router.post('/import', gvgController.importGVGData);

// Get GVG data for specific date
router.get('/date/:date', gvgController.getGVGDataByDate);

// Get GVG data within date range
router.get('/range', gvgController.getGVGDataByDateRange);

// Get all GVG data date list
router.get('/dates', gvgController.getAllGVGDates);

// Delete GVG data for specific date
router.delete('/date/:date', gvgController.deleteGVGData);

// Get GVG data statistics
router.get('/statistics', gvgController.getGVGStatistics);

// Get GVG image list for specific date
router.get('/images/:date', gvgController.getGVGImages);

// Get member's GVG participation status
router.get('/member/:memberName/participation', gvgController.getMemberGVGParticipation);

// Get all members' GVG participation status (batch)
router.get('/members/participation', gvgController.getAllMembersGVGParticipation);

// Get specific members' GVG participation status (batch)
router.post('/members/participation', gvgController.getMembersGVGParticipation);

export default router;