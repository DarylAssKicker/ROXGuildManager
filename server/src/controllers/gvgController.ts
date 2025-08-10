import { Request, Response } from 'express';
import gvgService from '../services/gvgService';
import { ImportGVGRequest, GetGVGRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';

class GVGController {
  /**
   * Import GVG data
   */
  async importGVGData(req: Request<{}, {}, ImportGVGRequest>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { gvgData } = req.body;

      if (!gvgData || !Array.isArray(gvgData) || gvgData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid GVG data',
          message: 'Please provide valid GVG data array'
        });
      }

      const result = await gvgService.importGVGData(req.user.userId, gvgData);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to import GVG data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while importing GVG data'
      });
    }
  }

  /**
   * Get GVG data for specified date
   */
  async getGVGDataByDate(req: Request<{ date: string }>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { date } = req.params;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Missing date parameter',
          message: 'Please provide valid date'
        });
      }

      const result = await gvgService.getGVGDataByDate(req.user.userId, date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to get GVG data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting GVG data'
      });
    }
  }

  /**
   * Get GVG data within date range
   */
  async getGVGDataByDateRange(req: Request<{}, {}, {}, GetGVGRequest>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing date parameters',
          message: 'Please provide start date and end date'
        });
      }

      const result = await gvgService.getGVGDataByDateRange(req.user.userId, startDate, endDate);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Failed to get GVG data range:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting GVG data range'
      });
    }
  }

  /**
   * Get date list of all GVG data
   */
  async getAllGVGDates(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await gvgService.getAllGVGDates(req.user.userId);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Failed to get GVG date list:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting GVG date list'
      });
    }
  }

  /**
   * Delete GVG data for specified date
   */
  async deleteGVGData(req: Request<{ date: string }>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { date } = req.params;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Missing date parameter',
          message: 'Please provide valid date'
        });
      }

      const result = await gvgService.deleteGVGData(req.user.userId, date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to delete GVG data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while deleting GVG data'
      });
    }
  }

  /**
   * Get GVG data statistics
   */
  async getGVGStatistics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await gvgService.getGVGStatistics(req.user.userId);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Failed to get GVG statistics:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting GVG statistics'
      });
    }
  }

  /**
   * Get GVG image list for specified date
   */
  async getGVGImages(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { date } = req.params;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Missing date parameter',
          message: 'Please provide date parameter'
        });
      }

      // Determine image directory path based on environment
      let imagePath: string;
      if (process.env.UPLOAD_PATH) {
        imagePath = path.join(process.env.UPLOAD_PATH, 'GVG', date);
      } else if (process.env.NODE_ENV === 'production') {
        // Production: use client directory under working directory
        imagePath = path.join(process.cwd(), 'client/public/images/GVG', date);
      } else {
        // Development: use path relative to source code
        imagePath = path.join(__dirname, '../../../client/public/images/GVG', date);
      }
      
      const imageDir = imagePath;
      
      if (!fs.existsSync(imageDir)) {
        return res.status(200).json({
          success: true,
          data: {
            date,
            images: [],
            count: 0
          },
          message: 'No saved images for this date'
        });
      }

      try {
        const files = fs.readdirSync(imageDir);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
        });

        const images = imageFiles.map(file => ({
          filename: file,
          path: `/images/GVG/${date}/${file}`,
          size: fs.statSync(path.join(imageDir, file)).size,
          created: fs.statSync(path.join(imageDir, file)).birthtime
        }));

        return res.status(200).json({
          success: true,
          data: {
            date,
            images,
            count: images.length
          }
        });

      } catch (error) {
        console.error('Failed to read image directory:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to read image directory',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error('Failed to get GVG images:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get member's GVG participation status
   */
  async getMemberGVGParticipation(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { memberName } = req.params;
      
      if (!memberName) {
        return res.status(400).json({
          success: false,
          error: 'Missing member name parameter',
          message: 'Please provide member name'
        });
      }

      const result = await gvgService.getMemberGVGParticipation(req.user.userId, decodeURIComponent(memberName));
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to get member GVG participation:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting member GVG participation status'
      });
    }
  }
}

export default new GVGController();