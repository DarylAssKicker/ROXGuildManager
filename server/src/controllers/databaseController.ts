import { Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { GuildNameResource, CreateGuildNameRequest, UpdateGuildNameRequest } from '../types';
import { getDataUserId } from '../middleware/permissionMiddleware';

export class DatabaseController {
  /**
   * Get database status
   */
  async getStatus(req: Request, res: Response) {
    try {
      const stats = await databaseService.getDatabaseStats();
      const health = await databaseService.healthCheck();
      
      res.json({
        success: true,
        data: {
          connected: databaseService.isDatabaseConnected(),
          health: health,
          stats: stats
        }
      });
    } catch (error) {
      console.error('Failed to get database status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get database status'
      });
    }
  }

  /**
   * Initialize database connection
   */
  async initialize(req: Request, res: Response) {
    try {
      const success = await databaseService.initialize();
      
      if (success) {
        res.json({
          success: true,
          message: 'Database connection initialized successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to initialize database connection'
        });
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize database'
      });
    }
  }

  /**
   * Get all guild IDs
   */
  async getAllGuildIds(req: Request, res: Response) {
    try {
      const guildIds = await databaseService.getAllGuildIds();
      
      res.json({
        success: true,
        data: guildIds
      });
    } catch (error) {
      console.error('Failed to get guild ID list:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get guild ID list'
      });
    }
  }

  /**
   * Get guild member data
   */
  async getGuildMembers(req: Request, res: Response): Promise<void> {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        res.status(400).json({
          success: false,
          error: 'Missing guild ID parameter'
        });
        return;
      }

      const members = await databaseService.getGuildMembers(guildId);
      
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error('Failed to get guild member data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get guild member data'
      });
    }
  }

  /**
   * Save guild member data
   */
  async saveGuildMembers(req: Request, res: Response): Promise<void> {
    try {
      const { guildId } = req.params;
      const { members } = req.body;
      
      if (!guildId) {
        res.status(400).json({
          success: false,
          error: 'Missing guild ID parameter'
        });
        return;
      }

      if (!members || !Array.isArray(members)) {
        res.status(400).json({
          success: false,
          error: 'Missing member data or invalid format'
        });
        return;
      }

      const success = await databaseService.saveGuildMembers(guildId, members);
      
      if (success) {
        res.json({
          success: true,
          message: `Successfully saved ${members.length} guild member data`
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to save guild member data'
        });
      }
    } catch (error) {
      console.error('Failed to save guild member data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save guild member data'
      });
    }
  }

  /**
   * Delete guild member data
   */
  async deleteGuildMembers(req: Request, res: Response): Promise<void> {
    try {
      const { guildId } = req.params;
      
      if (!guildId) {
        res.status(400).json({
          success: false,
          error: 'Missing guild ID parameter'
        });
        return;
      }

      const success = await databaseService.deleteGuildMembers(guildId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully deleted guild member data'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete guild member data'
        });
      }
    } catch (error) {
      console.error('Failed to delete guild member data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete guild member data'
      });
    }
  }

  /**
   * Update single guild member
   */
  async updateGuildMember(req: Request, res: Response) {
    try {
      const { guildId, memberName } = req.params;
      const memberData = req.body;
      
      if (!guildId || !memberName) {
        res.status(400).json({
          success: false,
          error: 'Missing guild ID or member name parameter'
        });
        return;
      }

      const success = await databaseService.updateGuildMember(guildId, memberName, memberData);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully updated guild member data'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Member not found or update failed'
        });
      }
    } catch (error) {
      console.error('Failed to update guild member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update guild member'
      });
    }
  }

  /**
   * Save OCR result
   */
  async saveOCRResult(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const result = req.body;
      
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing session ID parameter'
        });
        return;
      }

      const success = await databaseService.saveOCRResult(sessionId, result);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully saved OCR result'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to save OCR result'
        });
      }
    } catch (error) {
      console.error('Failed to save OCR result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save OCR result'
      });
    }
  }

  /**
   * Get OCR result
   */
  async getOCRResult(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing session ID parameter'
        });
        return;
      }

      const result = await databaseService.getOCRResult(sessionId);
      
      if (result) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'OCR result not found'
        });
      }
    } catch (error) {
      console.error('Failed to get OCR result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get OCR result'
      });
    }
  }

  /**
   * Set cache
   */
  async setCache(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, expireSeconds = 3600 } = req.body;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Missing cache key parameter'
        });
        return;
      }

      const success = await databaseService.setCache(key, value, expireSeconds);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully set cache'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to set cache'
        });
      }
    } catch (error) {
      console.error('Failed to set cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set cache'
      });
    }
  }

  /**
   * Get cache
   */
  async getCache(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Missing cache key parameter'
        });
        return;
      }

      const value = await databaseService.getCache(key);
      
      if (value !== null) {
        res.json({
          success: true,
          data: value
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Cache data not found'
        });
      }
    } catch (error) {
      console.error('Failed to get cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache'
      });
    }
  }

  /**
   * Delete cache
   */
  async deleteCache(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Missing cache key parameter'
        });
        return;
      }

      const success = await databaseService.deleteCache(key);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully deleted cache'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete cache'
        });
      }
    } catch (error) {
      console.error('Failed to delete cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete cache'
      });
    }
  }

  // ==================== Guild Name Resource Management ====================

  /**
   * Create guild name resource
   */
  async createGuildNameResource(req: Request, res: Response): Promise<void> {
    try {
      const { guildId, guildName, description }: CreateGuildNameRequest = req.body;
      
      if (!guildId || !guildName) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: guildId and guildName'
        });
        return;
      }

      // Check if guild name resource already exists
      const existingResource = await databaseService.getGuildNameResource(guildId);
      if (existingResource) {
        res.status(409).json({
          success: false,
          error: 'Guild name resource already exists'
        });
        return;
      }

      const guildNameResource: GuildNameResource = {
        guildId,
        guildName,
        description: description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await databaseService.saveGuildNameResource(guildId, guildNameResource);
      
      if (success) {
        res.status(201).json({
          success: true,
          data: guildNameResource,
          message: 'Successfully created guild name resource'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create guild name resource'
        });
      }
    } catch (error) {
      console.error('Failed to create guild name resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create guild name resource'
      });
    }
  }

  /**
   * Get all guild name resources
   */
  async getAllGuildNameResources(req: Request, res: Response): Promise<void> {
    try {
      const guildNameResources = await databaseService.getAllGuildNameResources();
      
      res.json({
        success: true,
        data: guildNameResources
      });
    } catch (error) {
      console.error('Failed to get all guild name resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get all guild name resources'
      });
    }
  }

  /**
   * Get guild name resource
   */
  async getGuildNameResource(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      const dataUserId = getDataUserId(req);

      const guildNameResource = await databaseService.getGuildNameResource(dataUserId);
      
      res.json({
        success: true,
        data: guildNameResource
      });
    } catch (error) {
      console.error('Failed to get guild name resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get guild name resource'
      });
    }
  }

  /**
   * Save guild name resource
   */
  async saveGuildNameResource(req: Request, res: Response): Promise<void> {
    try {
      const { guildName, description, backgroundImage }: CreateGuildNameRequest = req.body;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      const dataUserId = getDataUserId(req);

      if (!guildName) {
        res.status(400).json({
          success: false,
          error: 'Missing guild name parameter'
        });
        return;
      }

      const guildNameResource: GuildNameResource = {
        guildId: dataUserId,
        guildName,
        description: description || '',
        backgroundImage: backgroundImage || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await databaseService.saveGuildNameResource(dataUserId, guildNameResource);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully saved guild name resource',
          data: guildNameResource
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to save guild name resource'
        });
      }
    } catch (error) {
      console.error('Failed to save guild name resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save guild name resource'
      });
    }
  }

  /**
   * Update guild name resource
   */
  async updateGuildNameResource(req: Request, res: Response): Promise<void> {
    try {
      const updateData: UpdateGuildNameRequest = req.body;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      const dataUserId = getDataUserId(req);
      const success = await databaseService.updateGuildNameResource(dataUserId, updateData);
      
      if (success) {
        const updatedResource = await databaseService.getGuildNameResource(dataUserId);
        res.json({
          success: true,
          message: 'Successfully updated guild name resource',
          data: updatedResource
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update guild name resource'
        });
      }
    } catch (error) {
      console.error('Failed to update guild name resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update guild name resource'
      });
    }
  }

  /**
   * Delete guild name resource
   */
  async deleteGuildNameResource(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      const dataUserId = getDataUserId(req);

      const success = await databaseService.deleteGuildNameResource(dataUserId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully deleted guild name resource'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete guild name resource'
        });
      }
    } catch (error) {
      console.error('Failed to delete guild name resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete guild name resource'
      });
    }
  }

  /**
   * Upload background image
   */
  async uploadBackgroundImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      const dataUserId = getDataUserId(req);

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      // Return filename, client will use this filename
      const filename = req.file.filename;
      
      res.json({
        success: true,
        data: {
          filename,
          url: `/images/${filename}`
        },
        message: 'Background image uploaded successfully'
      });
    } catch (error) {
      console.error('Failed to upload background image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload background image'
      });
    }
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAll(req: Request, res: Response) {
    try {
      const success = await databaseService.clearAll();
      
      if (success) {
        res.json({
          success: true,
          message: 'Successfully cleared all data'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to clear data'
        });
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear data'
      });
    }
  }
}

export const databaseController = new DatabaseController();