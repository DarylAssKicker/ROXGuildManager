import { Request, Response } from 'express';
import kvmService from '../services/kvmService';
import { ImportKVMRequest, GetKVMRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { getDataUserId } from '../middleware/permissionMiddleware';

class KVMController {
  /**
   * Import KVM data
   */
  async importKVMData(req: Request<{}, {}, ImportKVMRequest>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { kvmData } = req.body;

      if (!kvmData || !Array.isArray(kvmData) || kvmData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid KVM data',
          message: 'Please provide valid KVM data array'
        });
      }

      const result = await kvmService.importKVMData(getDataUserId(req), kvmData);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Import KVM data controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while importing KVM data'
      });
    }
  }

  /**
   * Get KVM data for specified date
   */
  async getKVMDataByDate(req: Request<{ date: string }>, res: Response) {
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

      const result = await kvmService.getKVMDataByDate(getDataUserId(req), date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get KVM data controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting KVM data'
      });
    }
  }

  /**
   * Get KVM data within date range
   */
  async getKVMDataByDateRange(req: Request<{}, {}, {}, GetKVMRequest>, res: Response) {
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

      const dataUserId = getDataUserId(req as any);
      const result = await kvmService.getKVMDataByDateRange(dataUserId, startDate, endDate);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Get KVM data range controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting KVM data range'
      });
    }
  }

  /**
   * Get date list of all KVM data
   */
  async getAllKVMDates(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await kvmService.getAllKVMDates(getDataUserId(req));
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Get KVM date list controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting KVM date list'
      });
    }
  }

  /**
   * Delete KVM data for specified date
   */
  async deleteKVMData(req: Request<{ date: string }>, res: Response) {
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

      const result = await kvmService.deleteKVMData(getDataUserId(req), date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Delete KVM data controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while deleting KVM data'
      });
    }
  }

  /**
   * Get KVM data statistics
   */
  async getKVMStatistics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await kvmService.getKVMStatistics(getDataUserId(req));
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Get KVM statistics controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting KVM statistics'
      });
    }
  }

  /**
   * Get KVM image list for specified date
   */
  async getKVMImages(req: Request, res: Response) {
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
        imagePath = path.join(process.env.UPLOAD_PATH, 'KVM', date);
      } else if (process.env.NODE_ENV === 'production') {
        // Production environment: use client directory under working directory
        imagePath = path.join(process.cwd(), 'client/public/images/KVM', date);
      } else {
        // Development environment: use path relative to source code
        imagePath = path.join(__dirname, '../../../client/public/images/KVM', date);
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
          path: `/images/KVM/${date}/${file}`,
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
      console.error('Get KVM images controller error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new KVMController();