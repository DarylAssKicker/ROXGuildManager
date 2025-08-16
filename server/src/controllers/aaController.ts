import { Request, Response } from 'express';
import aaService from '../services/aaService';
import { ImportAARequest, GetAARequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';

class AAController {
  /**
   * Import AA data
   */
  async importAAData(req: Request<{}, {}, ImportAARequest>, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { aaData } = req.body;

      if (!aaData || !Array.isArray(aaData) || aaData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid AA data',
          message: 'Please provide valid AA data array'
        });
      }

      const result = await aaService.importAAData(req.user.userId, aaData);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to import AA data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get AA data for specified date
   */
  async getAADataByDate(req: Request<{ date: string }>, res: Response) {
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

      const result = await aaService.getAADataByDate(req.user.userId, date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to get AA data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get AA data within date range
   */
  async getAADataByDateRange(req: Request<{}, {}, {}, GetAARequest>, res: Response) {
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

      const result = await aaService.getAADataByDateRange(req.user.userId, startDate, endDate);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to get AA data range:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get date list of all AA data
   */
  async getAllAADates(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await aaService.getAllAADates(req.user.userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to get AA date list:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete AA data for specified date
   */
  async deleteAAData(req: Request<{ date: string }>, res: Response) {
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

      const result = await aaService.deleteAAData(req.user.userId, date);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to delete AA data:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get AA data statistics
   */
  async getAAStatistics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const result = await aaService.getAAStatistics(req.user.userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to get AA statistics:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get AA image list for specified date
   */
  async getAAImages(req: Request, res: Response) {
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
        imagePath = path.join(process.env.UPLOAD_PATH, 'AA', date);
      } else if (process.env.NODE_ENV === 'production') {
        // Production environment: use client directory under working directory
        imagePath = path.join(process.cwd(), 'client/public/images/AA', date);
      } else {
        // Development environment: use path relative to source code
        imagePath = path.join(__dirname, '../../../client/public/images/AA', date);
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
          path: `/images/AA/${date}/${file}`,
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
      console.error('Failed to get AA images:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload AA images for specific date
   */
  async uploadAAImages(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthenticated user',
          message: 'Please login first'
        });
      }

      const { date } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Missing date parameter',
          message: 'Please provide date parameter'
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          message: 'Please select images to upload'
        });
      }

      // Process uploaded files
      const uploadedImages = files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: `/images/AA/${date}/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        created: new Date()
      }));

      return res.status(200).json({
        success: true,
        data: {
          date,
          images: uploadedImages,
          count: uploadedImages.length
        },
        message: `Successfully uploaded ${uploadedImages.length} image(s)`
      });

    } catch (error) {
      console.error('Failed to upload AA images:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get member's AA participation status
   */
  async getMemberAAParticipation(req: Request<{ memberName: string }>, res: Response) {
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
          message: 'Please provide member name parameter'
        });
      }

      const result = await aaService.getMemberAAParticipation(req.user.userId, decodeURIComponent(memberName));
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to get member AA participation:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new AAController();