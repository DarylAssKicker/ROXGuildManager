import { Router } from 'express';
import kvmController from '../controllers/kvmController';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

// Import KVM data
router.post('/import', requirePermission('kvm', 'create'), kvmController.importKVMData);

// Get KVM data for specific date
router.get('/date/:date', requirePermission('kvm', 'read'), kvmController.getKVMDataByDate);

// Get KVM data within date range
router.get('/range', requirePermission('kvm', 'read'), kvmController.getKVMDataByDateRange);

// Get all KVM data date list
router.get('/dates', requirePermission('kvm', 'read'), kvmController.getAllKVMDates);

// Delete KVM data for specific date
router.delete('/date/:date', requirePermission('kvm', 'delete'), kvmController.deleteKVMData);

// Get KVM data statistics
router.get('/statistics', requirePermission('kvm', 'read'), kvmController.getKVMStatistics);

// Get KVM image list for specific date
router.get('/images/:date', requirePermission('kvm', 'read'), kvmController.getKVMImages);

export default router;