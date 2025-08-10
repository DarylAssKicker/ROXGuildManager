import { Request, Response } from 'express';
import templateService from '../services/templateService';
import { CreateTemplateRequest, UpdateTemplateRequest, GetTemplateRequest } from '../types';

class TemplateController {
  /**
   * Create template
   */
  async createTemplate(req: Request<{}, {}, CreateTemplateRequest>, res: Response) {
    try {
      const templateData = req.body;

      if (!templateData.name || !templateData.module || !templateData.template) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        message: 'Please provide template name, module type and template configuration'
        });
      }

      const result = await templateService.createTemplate(templateData);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      message: 'Unknown error occurred while creating template'
      });
    }
  }

  /**
   * Get template list
   */
  async getTemplates(req: Request<{}, {}, {}, GetTemplateRequest>, res: Response) {
    try {
      const { module, isDefault } = req.query;
      
      const result = await templateService.getTemplates(module, isDefault);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Failed to get template list:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      message: 'Unknown error occurred while getting template list'
      });
    }
  }

  /**
   * Get specified template
   */
  async getTemplateById(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing template ID',
        message: 'Please provide valid template ID'
        });
      }

      const result = await templateService.getTemplateById(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to get template details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      message: 'Unknown error occurred while getting template'
      });
    }
  }

  /**
   * Update template
   */
  async updateTemplate(req: Request<{ id: string }, {}, UpdateTemplateRequest>, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing template ID',
        message: 'Please provide valid template ID'
        });
      }

      const result = await templateService.updateTemplate(id, updateData);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      message: 'Unknown error occurred while updating template'
      });
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing template ID',
        message: 'Please provide valid template ID'
        });
      }

      const result = await templateService.deleteTemplate(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      message: 'Unknown error occurred while deleting template'
      });
    }
  }

  /**
   * Set default template
   */
  async setDefaultTemplate(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing template ID',
          message: 'Please provide valid template ID'
        });
      }

      const result = await templateService.setDefaultTemplate(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to set default template:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while setting default template'
      });
    }
  }

  /**
   * Get default template for module
   */
  async getDefaultTemplate(req: Request<{ module: string }>, res: Response) {
    try {
      const { module } = req.params;

      if (!module || !['kvm', 'gvg', 'aa', 'guild'].includes(module)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid module type',
          message: 'Please provide valid module type (kvm, gvg, aa, guild)'
        });
      }

      const result = await templateService.getDefaultTemplate(module as any);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error) {
      console.error('Failed to get default template:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unknown error occurred while getting default template'
      });
    }
  }
}

export default new TemplateController();