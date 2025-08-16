import { Request, Response } from 'express';
import { groupPartyService } from '../services/groupPartyService';
import { 
  ApiResponse, 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  CreatePartyRequest, 
  UpdatePartyRequest,
  AssignMemberToPartyRequest,
  RemoveMemberFromPartyRequest,
  SwapMembersRequest
} from '../types';
import { getDataUserId } from '../middleware/permissionMiddleware';

class GroupPartyController {
  // ==================== Group Controller ====================

  /**
   * Get all groups
   */
  async getAllGroups(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const groups = await groupPartyService.getAllGroups(dataUserId);
      const response: ApiResponse<typeof groups> = {
        success: true,
        data: groups,
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to get group list:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get group list',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get group details by ID
   */
  async getGroupById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const group = await groupPartyService.getGroupWithParties(id);
      
      if (!group) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group does not exist',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof group> = {
        success: true,
        data: group,
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to get group details:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get group details',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create new group
   */
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupData: CreateGroupRequest = req.body;
      
      // Validate required fields
      if (!groupData.name) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group name cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const newGroup = await groupPartyService.createGroup(groupData);
      const response: ApiResponse<typeof newGroup> = {
        success: true,
        data: newGroup,
        message: 'Group created successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Failed to create group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create group',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update group
   */
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const updateData: Omit<UpdateGroupRequest, 'id'> = req.body;
      
      const updatedGroup = await groupPartyService.updateGroup({ id, ...updateData });
      
      if (!updatedGroup) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group does not exist',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof updatedGroup> = {
        success: true,
        data: updatedGroup,
        message: 'Group updated successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to update group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update group',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const success = await groupPartyService.deleteGroup(id, dataUserId);
      
      if (!success) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group does not exist or deletion failed',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<null> = {
        success: true,
        message: 'Group deleted successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to delete group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete group',
      };
      res.status(500).json(response);
    }
  }

  // ==================== Party Controller ====================

  /**
   * Get all parties
   */
  async getAllParties(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 getAllParties API called');
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);
      const partyType = req.query.partyType as string;
      console.log(`👤 User ID: ${dataUserId}, party type filter: ${partyType}`);

      console.log(`🔄 Starting to get party data for user ${dataUserId}...`);
      const parties = await groupPartyService.getAllParties(dataUserId, partyType);
      console.log(`✅ Successfully retrieved ${parties.length} parties`);
      
      const response: ApiResponse<typeof parties> = {
        success: true,
        data: parties,
      };
      
      // Disable cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(response);
    } catch (error) {
      console.error('❌ Failed to get party list:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get party list',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get parties by group ID
   */
  async getPartiesByGroupId(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { groupId } = req.params;
      if (!groupId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Group ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const parties = await groupPartyService.getPartiesByGroupId(groupId, dataUserId);
      const response: ApiResponse<typeof parties> = {
        success: true,
        data: parties,
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to get party list under group:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get party list under group',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get party details by ID
   */
  async getPartyById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const party = await groupPartyService.getPartyWithMembers(id, dataUserId);
      
      if (!party) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party does not exist',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof party> = {
        success: true,
        data: party,
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to get party details:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get party details',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create new party
   */
  async createParty(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const partyData: CreatePartyRequest = req.body;
      
      // Validate required fields
      if (!partyData.name) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party name cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      // groupId is now optional, parties can belong to no group

      const newParty = await groupPartyService.createParty(partyData, dataUserId);
      const response: ApiResponse<typeof newParty> = {
        success: true,
        data: newParty,
        message: 'Party created successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Failed to create party:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create party',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update party
   */
  async updateParty(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const updateData: Omit<UpdatePartyRequest, 'id'> = req.body;
      
      const updatedParty = await groupPartyService.updateParty({ id, ...updateData }, dataUserId);
      
      if (!updatedParty) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party does not exist',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof updatedParty> = {
        success: true,
        data: updatedParty,
        message: 'Party updated successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to update party:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update party',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Delete party
   */
  async deleteParty(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { id } = req.params;
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      const success = await groupPartyService.deleteParty(id, dataUserId);
      
      if (!success) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Party does not exist or failed to delete',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<null> = {
        success: true,
        message: 'Party deleted successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to delete party:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete party',
      };
      res.status(500).json(response);
    }
  }

  // ==================== Member Assignment Controller ====================

  /**
   * Assign member to party
   */
  async assignMemberToParty(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const assignData: AssignMemberToPartyRequest = req.body;
      
      // Validate required fields
      if (!assignData.memberId || !assignData.partyId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID and Party ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      await groupPartyService.assignMemberToParty(assignData, dataUserId);
      const response: ApiResponse<null> = {
        success: true,
        message: 'Member assigned successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to assign member:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign member',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Remove member from party
   */
  async removeMemberFromParty(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const removeData: RemoveMemberFromPartyRequest = req.body;
      
      // Validate required fields
      if (!removeData.memberId || !removeData.partyId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID and Party ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      await groupPartyService.removeMemberFromParty(removeData, dataUserId);
      const response: ApiResponse<null> = {
        success: true,
        message: 'Member removed successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to remove member:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove member',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get unassigned members
   */
  async getUnassignedMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const { partyType } = req.query;
      const members = await groupPartyService.getUnassignedMembers(partyType as string, dataUserId);
      const response: ApiResponse<typeof members> = {
        success: true,
        data: members,
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to get unassigned members:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to get unassigned members',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Swap positions of two members
   */
  async swapMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const swapData: SwapMembersRequest = req.body;
      console.log(`📝 Controller received swap request:`, JSON.stringify(swapData, null, 2));
      
      // Validate required fields
      if (!swapData.member1Id || !swapData.member1PartyId || 
          !swapData.member2Id || !swapData.member2PartyId ||
          swapData.member1SlotIndex === undefined || swapData.member2SlotIndex === undefined) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID, Party ID and position index cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      await groupPartyService.swapMembers(swapData, dataUserId);
      const response: ApiResponse<null> = {
        success: true,
        message: 'Member positions swapped successfully',
      };
      res.json(response);
    } catch (error) {
      console.error('Failed to swap member positions:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to swap member positions',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Clear all party members
   */
  async clearAllParties(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }
      const dataUserId = getDataUserId(req);

      const success = await groupPartyService.clearAllParties(dataUserId);
      
      if (success) {
        const response: ApiResponse<null> = {
          success: true,
          message: 'All parties cleared',
        };
        res.json(response);
      } else {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Failed to clear parties',
        };
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Failed to clear parties:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear parties',
      };
      res.status(500).json(response);
    }
  }
}

export const groupPartyController = new GroupPartyController();
export default groupPartyController;