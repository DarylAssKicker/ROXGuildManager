import { Router } from 'express';
import gvgController from '../controllers/gvgController';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

// Import GVG data
router.post('/import', requirePermission('gvg', 'create'), gvgController.importGVGData);

// Get GVG data for specific date
router.get('/date/:date', requirePermission('gvg', 'read'), gvgController.getGVGDataByDate);

// Get GVG data within date range
router.get('/range', requirePermission('gvg', 'read'), gvgController.getGVGDataByDateRange);

// Get all GVG data date list
router.get('/dates', requirePermission('gvg', 'read'), gvgController.getAllGVGDates);

// Delete GVG data for specific date
router.delete('/date/:date', requirePermission('gvg', 'delete'), gvgController.deleteGVGData);

// Get GVG data statistics
router.get('/statistics', requirePermission('gvg', 'read'), gvgController.getGVGStatistics);

// Get GVG image list for specific date
router.get('/images/:date', requirePermission('gvg', 'read'), gvgController.getGVGImages);

// Delete GVG image by filename (delete permission required)
router.delete('/images/:date/:filename', requirePermission('gvg', 'delete'), gvgController.deleteGVGImage);

// Get member's GVG participation status
router.get('/member/:memberName/participation', requirePermission('gvg', 'read'), gvgController.getMemberGVGParticipation);

// Get all members' GVG participation status (batch)
router.get('/members/participation', requirePermission('gvg', 'read'), gvgController.getAllMembersGVGParticipation);

// Get specific members' GVG participation status (batch)
router.post('/members/participation', requirePermission('gvg', 'read'), gvgController.getMembersGVGParticipation);

export default router;