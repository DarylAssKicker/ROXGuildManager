import { Router } from 'express';
import subAccountController from '../controllers/subAccountController';
import { requireOwner } from '../middleware/permissionMiddleware';

const router = Router();

// Get current user's permissions and info
router.get('/me/permissions', subAccountController.getCurrentUserPermissions);

// Sub-account management (owner only)
router.get('/', requireOwner(), subAccountController.getSubAccounts);
router.post('/', requireOwner(), subAccountController.createSubAccount);
router.put('/:id', requireOwner(), subAccountController.updateSubAccount);
router.delete('/:id', requireOwner(), subAccountController.deleteSubAccount);

export default router;