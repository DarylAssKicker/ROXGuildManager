import { Router } from 'express';
import kvmController from '../controllers/kvmController';

const router = Router();

// Import KVM data
router.post('/import', kvmController.importKVMData);

// Get KVM data for specific date
router.get('/date/:date', kvmController.getKVMDataByDate);

// Get KVM data within date range
router.get('/range', kvmController.getKVMDataByDateRange);

// Get all KVM data date list
router.get('/dates', kvmController.getAllKVMDates);

// Delete KVM data for specific date
router.delete('/date/:date', kvmController.deleteKVMData);

// Get KVM data statistics
router.get('/statistics', kvmController.getKVMStatistics);

// Get KVM image list for specific date
router.get('/images/:date', kvmController.getKVMImages);

export default router;