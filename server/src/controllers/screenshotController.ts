import { Request, Response } from 'express';
import screenshotService from '../services/screenshotService';
import ocrService from '../services/ocrService';
import templateService from '../services/templateService';
import { ApiResponse } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ScreenshotController {
  // Reorganize AA images to correct date directory
  async reorganizeAAImages(oldPaths: string[], newDate: string): Promise<string[]> {
    const newPaths: string[] = [];
    
    // Determine new save path based on environment
    let newUploadPath: string;
    if (process.env.UPLOAD_PATH) {
      newUploadPath = path.join(process.env.UPLOAD_PATH, 'AA', newDate);
    } else if (process.env.NODE_ENV === 'production') {
      // Production: use client directory under working directory
      newUploadPath = path.join(process.cwd(), 'client/public/images/AA', newDate);
    } else {
      // Development: use path relative to source code
      newUploadPath = path.join(__dirname, '../../../client/public/images/AA', newDate);
    }
    
    const newBaseDir = newUploadPath;
    
    // Ensure new directory exists
    if (!fs.existsSync(newBaseDir)) {
      fs.mkdirSync(newBaseDir, { recursive: true });
    }
    
    for (const oldPath of oldPaths) {
      try {
        const fileName = path.basename(oldPath);
        const newPath = path.join(newBaseDir, fileName);
        
        // Move file to new location
        if (fs.existsSync(oldPath)) {
          fs.copyFileSync(oldPath, newPath);
          fs.unlinkSync(oldPath); // Delete original file
          newPaths.push(newPath);
          console.log(`AA image moved: ${oldPath} -> ${newPath}`);
        }
      } catch (error) {
        console.error(`Failed to move AA image:`, error);
      }
    }
    
    return newPaths;
  }

  // Save AA images to specified path
  async saveAAImages(imagesToProcess: Express.Multer.File[], aaDate: string, userId: string): Promise<string[]> {
    const savedPaths: string[] = [];
    
    // Determine save path based on environment, include userId in path
    let uploadPath: string;
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, userId, 'AA', aaDate);
    } else if (process.env.NODE_ENV === 'production') {
      // Production: Docker maps uploads to client/public/images
      uploadPath = path.join(process.cwd(), 'client/public/images', userId, 'AA', aaDate);
    } else {
      // Development: Use client/public/images directly
      uploadPath = path.join(__dirname, '../../../client/public/images', userId, 'AA', aaDate);
    }
    
    const baseDir = uploadPath;
    
    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const baseTimestamp = Date.now();
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const file = imagesToProcess[i];
      if (!file) continue;
      
      // Generate filename: original name or timestamp (ensure each file has unique timestamp)
      const uniqueTimestamp = baseTimestamp + i;
      const extension = path.extname(file.originalname) || '.jpg';
      const fileName = file.originalname ? 
        `${uniqueTimestamp}_${file.originalname}` : 
        `aa_${aaDate}_${i + 1}_${uniqueTimestamp}${extension}`;
      
      const filePath = path.join(baseDir, fileName);
      
      try {
        // Save file
        fs.writeFileSync(filePath, file.buffer);
        savedPaths.push(filePath);
        console.log(`AA image saved: ${filePath}`);
      } catch (error) {
        console.error(`Failed to save AA image ${fileName}:`, error);
      }
    }
    
    return savedPaths;
  }

  // Save GVG images to specified path
  async saveGVGImages(imagesToProcess: Express.Multer.File[], gvgDate: string, userId: string): Promise<string[]> {
    const savedPaths: string[] = [];
    
    // Determine save path based on environment, include userId in path
    let uploadPath: string;
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, userId, 'GVG', gvgDate);
    } else if (process.env.NODE_ENV === 'production') {
      // Production: Docker maps uploads to client/public/images
      uploadPath = path.join(process.cwd(), 'client/public/images', userId, 'GVG', gvgDate);
    } else {
      // Development: Use client/public/images directly
      uploadPath = path.join(__dirname, '../../../client/public/images', userId, 'GVG', gvgDate);
    }
    
    const baseDir = uploadPath;
    
    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const baseTimestamp = Date.now();
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const file = imagesToProcess[i];
      if (!file) continue;
      
      // Generate filename: original name or timestamp (ensure each file has unique timestamp)
      const uniqueTimestamp = baseTimestamp + i;
      const extension = path.extname(file.originalname) || '.jpg';
      const fileName = file.originalname ? 
        `${uniqueTimestamp}_${file.originalname}` : 
        `gvg_${gvgDate}_${i + 1}_${uniqueTimestamp}${extension}`;
      
      const filePath = path.join(baseDir, fileName);
      
      try {
        // Save file
        fs.writeFileSync(filePath, file.buffer);
        savedPaths.push(filePath);
        console.log(`GVG image saved: ${filePath}`);
      } catch (error) {
        console.error(`Failed to save GVG image ${fileName}:`, error);
      }
    }
    
    return savedPaths;
  }

  // Reorganize GVG images to correct date directory
  async reorganizeGVGImages(oldPaths: string[], newDate: string): Promise<string[]> {
    const newPaths: string[] = [];
    
    // Determine new save path based on environment
    let newUploadPath: string;
    if (process.env.UPLOAD_PATH) {
      newUploadPath = path.join(process.env.UPLOAD_PATH, 'GVG', newDate);
    } else if (process.env.NODE_ENV === 'production') {
      newUploadPath = path.join(process.cwd(), 'client/public/images/GVG', newDate);
    } else {
      newUploadPath = path.join(__dirname, '../../../client/public/images/GVG', newDate);
    }
    
    const newBaseDir = newUploadPath;
    
    // Ensure new directory exists
    if (!fs.existsSync(newBaseDir)) {
      fs.mkdirSync(newBaseDir, { recursive: true });
    }
    
    for (const oldPath of oldPaths) {
      try {
        const fileName = path.basename(oldPath);
        const newPath = path.join(newBaseDir, fileName);
        
        // Move file
        if (fs.existsSync(oldPath)) {
          fs.copyFileSync(oldPath, newPath);
          fs.unlinkSync(oldPath); // Delete original file
          newPaths.push(newPath);
          console.log(`GVG image moved: ${oldPath} -> ${newPath}`);
        }
      } catch (error) {
        console.error(`Failed to move GVG image ${oldPath}:`, error);
      }
    }
    
    return newPaths;
  }

  // Save KVM images to specified path
  async saveKVMImages(imagesToProcess: Express.Multer.File[], kvmDate: string, userId: string): Promise<string[]> {
    const savedPaths: string[] = [];
    
    // Determine save path based on environment, include userId in path
    let uploadPath: string;
    if (process.env.UPLOAD_PATH) {
      uploadPath = path.join(process.env.UPLOAD_PATH, userId, 'KVM', kvmDate);
    } else if (process.env.NODE_ENV === 'production') {
      // Production: Docker maps uploads to client/public/images
      uploadPath = path.join(process.cwd(), 'client/public/images', userId, 'KVM', kvmDate);
    } else {
      // Development: Use client/public/images directly
      uploadPath = path.join(__dirname, '../../../client/public/images', userId, 'KVM', kvmDate);
    }
    
    const baseDir = uploadPath;
    
    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const baseTimestamp = Date.now();
    
    for (let i = 0; i < imagesToProcess.length; i++) {
      const file = imagesToProcess[i];
      if (!file) continue;
      
      // Generate filename: original name or timestamp (ensure each file has unique timestamp)
      const uniqueTimestamp = baseTimestamp + i;
      const extension = path.extname(file.originalname) || '.jpg';
      const fileName = file.originalname ? 
        `${uniqueTimestamp}_${file.originalname}` : 
        `kvm_${kvmDate}_${i + 1}_${uniqueTimestamp}${extension}`;
      
      const filePath = path.join(baseDir, fileName);
      
      try {
        // Save file
        fs.writeFileSync(filePath, file.buffer);
        savedPaths.push(filePath);
        console.log(`KVM image saved: ${filePath}`);
      } catch (error) {
        console.error(`Failed to save KVM image ${fileName}:`, error);
      }
    }
    
    return savedPaths;
  }

  // Reorganize KVM images to correct date directory
  async reorganizeKVMImages(oldPaths: string[], newDate: string): Promise<string[]> {
    const newPaths: string[] = [];
    
    // Determine new save path based on environment
    let newUploadPath: string;
    if (process.env.UPLOAD_PATH) {
      newUploadPath = path.join(process.env.UPLOAD_PATH, 'KVM', newDate);
    } else if (process.env.NODE_ENV === 'production') {
      newUploadPath = path.join(process.cwd(), 'client/public/images/KVM', newDate);
    } else {
      newUploadPath = path.join(__dirname, '../../../client/public/images/KVM', newDate);
    }
    
    const newBaseDir = newUploadPath;
    
    // Ensure new directory exists
    if (!fs.existsSync(newBaseDir)) {
      fs.mkdirSync(newBaseDir, { recursive: true });
    }
    
    for (const oldPath of oldPaths) {
      try {
        const fileName = path.basename(oldPath);
        const newPath = path.join(newBaseDir, fileName);
        
        // Move file
        if (fs.existsSync(oldPath)) {
          fs.copyFileSync(oldPath, newPath);
          fs.unlinkSync(oldPath); // Delete original file
          newPaths.push(newPath);
          console.log(`KVM image moved: ${oldPath} -> ${newPath}`);
        }
      } catch (error) {
        console.error(`Failed to move KVM image ${oldPath}:`, error);
      }
    }
    
    return newPaths;
  }

  // Analyze screenshot
  async analyzeScreenshot(req: Request, res: Response): Promise<void> {
    try {
      // Support single file and multiple file upload
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const singleFile = req.file;
      
      let imagesToProcess: Express.Multer.File[] = [];
      
      if (filesObj) {
        // Handle multiple file upload (screenshots field)
        if (filesObj.screenshots) {
          imagesToProcess = filesObj.screenshots;
        }
        // Handle single file upload (screenshot field)
        else if (filesObj.screenshot) {
          imagesToProcess = filesObj.screenshot;
        }
      }
      // Compatible with old single file upload method
      else if (singleFile) {
        imagesToProcess = [singleFile];
      }
      
      if (imagesToProcess.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Please upload screenshot files',
        };
        res.status(400).json(response);
        return;
      }

      // Get template and module information
      const templateId = req.body.templateId;
      const module = req.body.module || 'guild'; // Default to guild mode
      
      let template = null;
      if (templateId) {
        const templateResult = await templateService.getTemplateById(templateId);
        if (templateResult.success) {
          template = templateResult.data;
        }
      } else if (module) {
        // If no template specified, try to get module's default template
        const defaultTemplateResult = await templateService.getDefaultTemplate(module);
        if (defaultTemplateResult.success) {
          template = defaultTemplateResult.data;
        }
      }

      const results: any[] = [];
      let combinedRawText = '';
      let totalProcessingTime = 0;
      let averageConfidence = 0;
      let confidenceCount = 0;
      let savedImagePaths: string[] = [];


      console.log(`// If AA, GVG or KVM module, save images first (use current date as default)`);

      // Get user ID from authenticated user
      const userId = req.user?.id;
      if (!userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User authentication required',
        };
        res.status(401).json(response);
        return;
      }
      
      let imageDate: string = new Date().toISOString().split('T')[0] || new Date().toLocaleDateString();
      if (module === 'aa' && imagesToProcess.length > 0) {
        savedImagePaths = await this.saveAAImages(imagesToProcess, imageDate, userId);
        console.log(`Saved ${savedImagePaths.length} AA images to user directory: ${userId}/AA/${imageDate}`);
      } else if (module === 'gvg' && imagesToProcess.length > 0) {
        savedImagePaths = await this.saveGVGImages(imagesToProcess, imageDate, userId);
        console.log(`Saved ${savedImagePaths.length} GVG images to user directory: ${userId}/GVG/${imageDate}`);
      } else if (module === 'kvm' && imagesToProcess.length > 0) {
        savedImagePaths = await this.saveKVMImages(imagesToProcess, imageDate, userId);
        console.log(`Saved ${savedImagePaths.length} KVM images to user directory: ${userId}/KVM/${imageDate}`);
      }

      // Process each image - only do OCR recognition first, don't apply template
      for (let i = 0; i < imagesToProcess.length; i++) {
        const file = imagesToProcess[i];
        if (!file) continue;
        
        // Validate file
        const validation = screenshotService.validateImage(file);
        if (!validation.valid) {
          continue; // Skip invalid files
        }

        // Use OCR service to recognize image, don't pass template (avoid duplicate template application)
        const ocrResult = await ocrService.recognizeText(file.buffer);
        
        if (ocrResult.success) {
          results.push({
            fileIndex: i,
            fileName: file?.originalname || `file-${i}`,
            data: ocrResult.data,
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            processingTime: ocrResult.processingTime
          });

          // Merge text results
          if (ocrResult.text) {
            combinedRawText += (combinedRawText ? '\n---Image Separator---\n' : '') + ocrResult.text;
          }

          // Accumulate statistics
          totalProcessingTime += ocrResult.processingTime || 0;
          if (ocrResult.confidence) {
            averageConfidence += ocrResult.confidence;
            confidenceCount++;
          }
        }
      }

      if (results.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'OCR recognition failed, all images cannot be processed',
        };
        res.status(500).json(response);
        return;
      }

      // Calculate average confidence
      averageConfidence = confidenceCount > 0 ? averageConfidence / confidenceCount : 0;

      // If template exists, apply template processing to merged text
      let processedTemplateData = null;
      if (template && combinedRawText) {
        console.log(`Apply template to merged text: ${template.name} (${template.module})`);
        processedTemplateData = await ocrService.applyTemplateToText(combinedRawText, template);
        
        // If AA, GVG or KVM module and template processing successful, check if date is recognized and reorganize images
        if ((module === 'aa' || module === 'gvg' || module === 'kvm') && processedTemplateData && savedImagePaths.length > 0) {
          let extractedDate = null;
          
          // Try to extract date from template processing result
          if (processedTemplateData.date) {
            extractedDate = processedTemplateData.date;
          } else if (Array.isArray(processedTemplateData) && processedTemplateData.length > 0 && processedTemplateData[0].date) {
            extractedDate = processedTemplateData[0].date;
          }
          
          // If extracted date differs from currently used date, reorganize images
          if (extractedDate && extractedDate !== imageDate) {
            console.log(`Detected ${module.toUpperCase()} date: ${extractedDate}, reorganizing images...`);
            let newImagePaths: string[];
            if (module === 'aa') {
              newImagePaths = await this.reorganizeAAImages(savedImagePaths, extractedDate);
            } else if (module === 'gvg') {
              newImagePaths = await this.reorganizeGVGImages(savedImagePaths, extractedDate);
            } else {
              newImagePaths = await this.reorganizeKVMImages(savedImagePaths, extractedDate);
            }
            savedImagePaths = newImagePaths;
            imageDate = extractedDate;
            console.log(`${module.toUpperCase()} images reorganized to correct date directory: ${extractedDate}`);
          }
        }
      }

      // Build response data
      const responseData = {
        // If template processing result exists, use it; otherwise use original OCR result
        ocrResult: processedTemplateData || (results.length === 1 ? results[0].data : results),
        rawText: combinedRawText,
        confidence: averageConfidence,
        processingTime: totalProcessingTime,
        timestamp: new Date().toISOString(),
        multipleFiles: results.length > 1,
        processedCount: results.length,
        totalFiles: imagesToProcess.length,
        template: template ? {
          id: template.id,
          name: template.name,
          module: template.module,
          applied: !!processedTemplateData
        } : null,
        fileInfos: imagesToProcess.map((file, index) => ({
          index,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          processed: results.some(r => r.fileIndex === index)
        })),
        // Add saved image path information (AA module only)
        savedImages: module === 'aa' ? {
          count: savedImagePaths.length,
          paths: savedImagePaths,
          directory: savedImagePaths.length > 0 && savedImagePaths[0] ? path.dirname(savedImagePaths[0]) : null
        } : null
      };

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: `Screenshot recognition successful, processed ${results.length}/${imagesToProcess.length} images`,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot recognition failed',
      };
      res.status(500).json(response);
    }
  }

  // Get recognition history
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await screenshotService.getHistory();
      const response: ApiResponse<typeof history> = {
        success: true,
        data: history,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recognition history',
      };
      res.status(500).json(response);
    }
  }

  // Clear recognition history
  async clearHistory(req: Request, res: Response): Promise<void> {
    try {
      await screenshotService.clearHistory();
      const response: ApiResponse<null> = {
        success: true,
        message: 'Recognition history cleared',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear recognition history',
      };
      res.status(500).json(response);
    }
  }

  // Get recognition statistics
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [screenshotStats, ocrStats] = await Promise.all([
        screenshotService.getStatistics(),
        ocrService.getStatistics()
      ]);

      const combinedStats = {
        screenshot: screenshotStats,
        ocr: ocrStats
      };

      const response: ApiResponse<typeof combinedStats> = {
        success: true,
        data: combinedStats,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics',
      };
      res.status(500).json(response);
    }
  }

  // Get OCR service status
  async getOCRStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await ocrService.getStatistics();
      const response: ApiResponse<typeof status> = {
        success: true,
        data: status,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get OCR status',
      };
      res.status(500).json(response);
    }
  }

  // Reinitialize OCR service
  async reinitializeOCR(req: Request, res: Response): Promise<void> {
    try {
      await ocrService.terminate();
      await ocrService.initialize();
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'OCR service reinitialized successfully',
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reinitialize OCR service',
      };
      res.status(500).json(response);
    }
  }
}

export default new ScreenshotController();