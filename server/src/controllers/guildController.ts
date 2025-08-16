import { Request, Response } from 'express';
import guildService from '../services/guildService';
import { ApiResponse, CreateMemberRequest } from '../types';
import { getDataUserId } from '../middleware/permissionMiddleware';

export class GuildController {
  // Get all guild members
  async getMembers(req: Request, res: Response): Promise<void> {
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
      const members = await guildService.getAllMembers(dataUserId);
      const response: ApiResponse<typeof members> = {
        success: true,
        data: members,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guild members',
      };
      res.status(500).json(response);
    }
  }

  // Get single guild member
  async getMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      
      // Convert string ID to number
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID must be a valid number',
        };
        res.status(400).json(response);
        return;
      }
      
      const dataUserId = getDataUserId(req);
      const member = await guildService.getMemberById(numericId, dataUserId);
      
      if (!member) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Guild member does not exist',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<typeof member> = {
        success: true,
        data: member,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guild member',
      };
      res.status(500).json(response);
    }
  }

  // Create guild member
  async createMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication information missing',
        };
        res.status(401).json(response);
        return;
      }

      const memberData: CreateMemberRequest = req.body;
      
      // Validate required fields
      if (!memberData.name) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member name cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const dataUserId = getDataUserId(req);
      const newMember = await guildService.createMember(memberData, dataUserId);
      const response: ApiResponse<typeof newMember> = {
        success: true,
        data: newMember,
        message: 'Guild member created successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create guild member',
      };
      res.status(500).json(response);
    }
  }

  // Update guild member
  async updateMember(req: Request, res: Response): Promise<void> {
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
      const updateData = req.body;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      
      // Convert string ID to number
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID must be a valid number',
        };
        res.status(400).json(response);
        return;
      }
      
      const updatedMember = await guildService.updateMember(numericId, updateData, dataUserId);
      const response: ApiResponse<typeof updatedMember> = {
        success: true,
        data: updatedMember,
        message: 'Guild member updated successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guild member',
      };
      res.status(500).json(response);
    }
  }

  // Delete guild member
  async deleteMember(req: Request, res: Response): Promise<void> {
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
          error: 'Member ID cannot be empty',
        };
        res.status(400).json(response);
        return;
      }
      
      // Convert string ID to number
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member ID must be a valid number',
        };
        res.status(400).json(response);
        return;
      }
      
      await guildService.deleteMember(numericId, dataUserId);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Guild member deleted successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete guild member',
      };
      res.status(500).json(response);
    }
  }

  // Delete all guild members
  async deleteAllMembers(req: Request, res: Response): Promise<void> {
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

      await guildService.deleteAllMembers(dataUserId);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'All guild members deleted successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete all guild members',
      };
      res.status(500).json(response);
    }
  }

  // Batch update guild members
  async batchUpdateMembers(req: Request, res: Response): Promise<void> {
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

      const { members } = req.body;
      
      if (!Array.isArray(members)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Member data format error',
        };
        res.status(400).json(response);
        return;
      }

      await guildService.batchUpdateMembers(members, dataUserId);
      const response: ApiResponse<null> = {
        success: true,
        message: 'Guild members batch updated successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch update guild members',
      };
      res.status(500).json(response);
    }
  }

  // Get guild information
  async getGuildInfo(req: Request, res: Response): Promise<void> {
    try {
      const guildInfo = await guildService.getGuildInfo();
      const response: ApiResponse<typeof guildInfo> = {
        success: true,
        data: guildInfo,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guild information',
      };
      res.status(500).json(response);
    }
  }

  // Update guild information
  async updateGuildInfo(req: Request, res: Response): Promise<void> {
    try {
      const updateData = req.body;
      const updatedInfo = await guildService.updateGuildInfo(updateData);
      
      const response: ApiResponse<typeof updatedInfo> = {
        success: true,
        data: updatedInfo,
        message: 'Guild information updated successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guild information',
      };
      res.status(500).json(response);
    }
  }

  // Search guild members
  async searchMembers(req: Request, res: Response): Promise<void> {
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

      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Search keyword cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const members = await guildService.searchMembers(q, dataUserId);
      const response: ApiResponse<typeof members> = {
        success: true,
        data: members,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search guild members',
      };
      res.status(500).json(response);
    }
  }

  // Filter members by class
  async getMembersByClass(req: Request, res: Response): Promise<void> {
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

      const { className } = req.params;
      
      if (!className) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Class parameter cannot be empty',
        };
        res.status(400).json(response);
        return;
      }

      const members = await guildService.getMembersByClass(className, dataUserId);
      const response: ApiResponse<typeof members> = {
        success: true,
        data: members,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get class members',
      };
      res.status(500).json(response);
    }
  }
}

export default new GuildController();