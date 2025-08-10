import { Router } from 'express';
import { groupPartyController } from '../controllers/groupPartyController';

const router = Router();

// ==================== Group Routes ====================

// Get all groups
router.get('/groups', groupPartyController.getAllGroups);

// Get group details by ID (including parties and members)
router.get('/groups/:id', groupPartyController.getGroupById);

// Create new group
router.post('/groups', groupPartyController.createGroup);

// Update group
router.put('/groups/:id', groupPartyController.updateGroup);

// Delete group
router.delete('/groups/:id', groupPartyController.deleteGroup);

// ==================== Party Routes ====================

// Get all parties
router.get('/parties', groupPartyController.getAllParties);

// Get party list by group ID
router.get('/groups/:groupId/parties', groupPartyController.getPartiesByGroupId);

// Get party details by ID (including members)
router.get('/parties/:id', groupPartyController.getPartyById);

// Create new party
router.post('/parties', groupPartyController.createParty);

// Update party
router.put('/parties/:id', groupPartyController.updateParty);

// Delete party
router.delete('/parties/:id', groupPartyController.deleteParty);

// ==================== Member Assignment Routes ====================

// Assign member to party
router.post('/assign-member', groupPartyController.assignMemberToParty);

// Remove member from party
router.post('/remove-member', groupPartyController.removeMemberFromParty);

// Get unassigned members
router.get('/unassigned-members', groupPartyController.getUnassignedMembers);

// Swap member positions
router.post('/swap-members', groupPartyController.swapMembers);

// Clear all parties
router.post('/clear-all-parties', groupPartyController.clearAllParties);

export default router;