import Redis from 'ioredis';
import { OCRTemplate, CreateTemplateRequest, UpdateTemplateRequest, ApiResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Template name internationalization
const templateNames = {
  'zh-CN': {
    defaultGuildTemplate: 'Default Guild Member Template',
    defaultKVMTemplate: 'Default KVM Template',
    defaultGVGTemplate: 'Default GVG Template',
    defaultAATemplate: 'Default AA Template'
  },
  'en': {
    defaultGuildTemplate: 'Default Guild Member Template',
    defaultKVMTemplate: 'Default KVM Template',
    defaultGVGTemplate: 'Default GVG Template',
    defaultAATemplate: 'Default AA Template'
  },
  'zh-TW': {
    defaultGuildTemplate: 'Default Guild Member Template',
    defaultKVMTemplate: 'Default KVM Template',
    defaultGVGTemplate: 'Default GVG Template',
    defaultAATemplate: 'Default AA Template'
  }
};

// Function to get template name
const getTemplateName = (key: string, language: string = 'zh-CN'): string => {
  const lang = templateNames[language as keyof typeof templateNames] || templateNames['zh-CN'];
  return lang[key as keyof typeof lang] || key;
};

class TemplateService {
  private redis: Redis;

  constructor() {
    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '0'),
    };
    
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
    
    this.redis = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully (Template Service)');
    });

    // Initialize default templates
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   */
  private async initializeDefaultTemplates() {
    try {
      // Check if default templates already exist
      const existingTemplates = await this.redis.keys('template:*');
      if (existingTemplates.length > 0) {
        console.log('Default templates already exist, skipping initialization');
        return;
      }

      // Create default templates for each language
      const languages = ['zh-CN', 'en', 'zh-TW'];
      const defaultTemplates: CreateTemplateRequest[] = [];
      
      for (const language of languages) {
        defaultTemplates.push(
          this.createDefaultGuildTemplate(language),
          this.createDefaultKVMTemplate(language),
          this.createDefaultGVGTemplate(language),
          this.createDefaultAATemplate(language)
        );
      }

      for (const template of defaultTemplates) {
        await this.createTemplate(template);
      }

      console.log('Default template initialization completed');
    } catch (error) {
      console.error('Failed to initialize default templates:', error);
    }
  }

  /**
   * Create default guild member template
   */
  private createDefaultGuildTemplate(language: string = 'zh-CN'): CreateTemplateRequest {
    return {
      name: getTemplateName('defaultGuildTemplate', language),
      module: 'guild',
      description: 'Default template for recognizing guild member lists',
      isDefault: true,
      template: {
        fieldMapping: {
          name: {
            name: 'Name',
            type: 'string',
            required: true
          },
          level: {
            name: 'Level',
            type: 'number',
            required: true,
            validation: { min: 1, max: 999 }
          },
          class: {
            name: 'Class',
            type: 'string',
            required: true
          },
          gender: {
            name: 'Gender',
            type: 'string',
            required: false,
            validation: { enum: ['Male', 'Female'] }
          },
          position: {
            name: 'Guild ID',
            type: 'string',
            required: false,
            defaultValue: '187'
          },
          sevenDayContribution: {
            name: 'Seven Day Contribution',
            type: 'number',
            required: false,
            defaultValue: 0
          },
          totalContribution: {
            name: 'Total Contribution',
            type: 'number',
            required: false,
            defaultValue: 0
          },
          onlineTime: {
            name: 'Online Status',
            type: 'string',
            required: false,
            defaultValue: 'Online'
          }
        },
        parseRules: [
          {
            name: 'Skip header row',
            type: 'line_pattern',
            config: {
              skipConditions: ['oO', '©', 'Guild', 'Member']
            }
          },
          {
            name: 'Class recognition',
            type: 'keyword_extraction',
            config: {
              keywords: [
                'Whitesmith', 'High Priest', 'Lord Knight', 'Paladin', 'Assassin Cross',
                'High Wizard', 'Champion', 'Sniper', 'Clown', 'Gypsy', 'Stalker',
                'Creator', 'Professor', 'Priest', 'Knight', 'Wizard', 'Archer',
                'Assassin', 'Merchant', 'Monk', 'Hunter', 'Blacksmith', 'Sage',
                'Rogue', 'Alchemist', 'Bard', 'Dancer'
              ]
            }
          }
        ],
        outputFormat: {
          type: 'guild',
          structure: {
            type: 'array',
            items: 'GuildMember'
          }
        }
      }
    };
  }

  /**
   * Create default KVM template
   */
  private createDefaultKVMTemplate(language: string = 'zh-CN'): CreateTemplateRequest {
    return {
      name: getTemplateName('defaultKVMTemplate', language),
      module: 'kvm',
      description: 'Default template for recognizing KVM activity data',
      isDefault: true,
      template: {
        fieldMapping: {
          date: {
            name: 'Date',
            type: 'date',
            required: true
          },
          event_type: {
            name: 'Event Type',
            type: 'string',
            required: true,
            defaultValue: 'KVM'
          },
          non_participants: {
            name: 'Non-participants',
            type: 'array',
            required: true
          }
        },
        parseRules: [
          {
            name: 'Extract member names',
            type: 'line_pattern',
            config: {
              pattern: '^\\w+.*$'
            }
          }
        ],
        outputFormat: {
          type: 'kvm',
          structure: {
            type: 'object',
            properties: 'KVMInfo'
          }
        }
      }
    };
  }

  /**
   * Create default GVG template
   */
  private createDefaultGVGTemplate(language: string = 'zh-CN'): CreateTemplateRequest {
    return {
      name: getTemplateName('defaultGVGTemplate', language),
      module: 'gvg',
      description: 'Default template for recognizing GVG activity data',
      isDefault: true,
      template: {
        fieldMapping: {
          date: {
            name: 'Date',
            type: 'date',
            required: true
          },
          event_type: {
            name: 'Event Type',
            type: 'string',
            required: true,
            defaultValue: 'GVG'
          },
          non_participants: {
            name: 'Non-participants',
            type: 'array',
            required: true
          }
        },
        parseRules: [
          {
            name: 'Extract member names',
            type: 'line_pattern',
            config: {
              pattern: '^\\w+.*$'
            }
          }
        ],
        outputFormat: {
          type: 'gvg',
          structure: {
            type: 'object',
            properties: 'GVGInfo'
          }
        }
      }
    };
  }

  /**
   * Create default AA template
   */
  private createDefaultAATemplate(language: string = 'zh-CN'): CreateTemplateRequest {
    return {
      name: getTemplateName('defaultAATemplate', language),
      module: 'aa',
      description: 'Default template for recognizing AA activity data',
      isDefault: true,
      template: {
        fieldMapping: {
          date: {
            name: 'Date',
            type: 'date',
            required: true
          },
          event_type: {
            name: 'Event Type',
            type: 'string',
            required: true,
            defaultValue: 'AA'
          },
          participants: {
            name: 'Participants',
            type: 'array',
            required: true
          }
        },
        parseRules: [
          {
            name: 'Extract ranking information',
            type: 'line_pattern',
            config: {
              pattern: '^\\d+\\s+\\w+\\s+\\w+\\s+\\d+$'
            }
          }
        ],
        outputFormat: {
          type: 'aa',
          structure: {
            type: 'object',
            properties: 'AAInfo'
          }
        }
      }
    };
  }

  /**
   * Create template
   */
  async createTemplate(templateData: CreateTemplateRequest): Promise<ApiResponse<OCRTemplate>> {
    try {
      const templateId = uuidv4();
      const now = new Date().toISOString();
      
      const template: OCRTemplate = {
        id: templateId,
        name: templateData.name,
        module: templateData.module,
        description: templateData.description || '',
        template: templateData.template,
        isDefault: templateData.isDefault || false,
        createdAt: now,
        updatedAt: now
      };

      // If set as default template, first cancel other default templates
      if (template.isDefault) {
        await this.clearDefaultTemplates(template.module);
      }

      // Save to Redis
      const key = `template:${templateId}`;
      await this.redis.set(key, JSON.stringify(template)); // Persistent storage
      
      // Add to module index
      await this.redis.sadd(`templates:${template.module}`, templateId);
      
      // If it's a default template, set default index
      if (template.isDefault) {
        await this.redis.set(`template:default:${template.module}`, templateId);
      }

      console.log(`Template created successfully: ${template.name} (${templateId})`);
      return {
        success: true,
        data: template,
        message: `Template created successfully`
      };
    } catch (error) {
      console.error('Failed to create template:', error);
      return {
        success: false,
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear default template flags
   */
  private async clearDefaultTemplates(module: string) {
    try {
      const templateIds = await this.redis.smembers(`templates:${module}`);
      for (const templateId of templateIds) {
        const key = `template:${templateId}`;
        const templateData = await this.redis.get(key);
        if (templateData) {
          const template: OCRTemplate = JSON.parse(templateData);
          if (template.isDefault) {
            template.isDefault = false;
            template.updatedAt = new Date().toISOString();
            await this.redis.set(key, JSON.stringify(template));
          }
        }
      }
      // Clear default index
      await this.redis.del(`template:default:${module}`);
    } catch (error) {
      console.error('Failed to clear default templates:', error);
    }
  }

  /**
   * Get template list
   */
  async getTemplates(module?: string, isDefault?: boolean): Promise<ApiResponse<OCRTemplate[]>> {
    try {
      let templateIds: string[] = [];
      
      if (module) {
        templateIds = await this.redis.smembers(`templates:${module}`);
      } else {
        const allKeys = await this.redis.keys('template:*');
        templateIds = allKeys
          .filter(key => !key.includes(':default:') && key.startsWith('template:'))
          .map(key => key.replace('template:', ''));
      }

      const templates: OCRTemplate[] = [];
      
      for (const templateId of templateIds) {
        const key = `template:${templateId}`;
        const templateData = await this.redis.get(key);
        if (templateData) {
          const template: OCRTemplate = JSON.parse(templateData);
          
          // Filter default templates
          if (isDefault !== undefined && template.isDefault !== isDefault) {
            continue;
          }
          
          templates.push(template);
        }
      }

      // Sort by update time
      templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        success: true,
        data: templates
      };
    } catch (error) {
      console.error('Failed to get template list:', error);
      return {
        success: false,
        error: 'Failed to get template list',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ApiResponse<OCRTemplate>> {
    try {
      const key = `template:${templateId}`;
      const templateData = await this.redis.get(key);
      
      if (!templateData) {
        return {
          success: false,
          error: 'Template not found',
          message: `Template ${templateId} does not exist`
        };
      }

      const template: OCRTemplate = JSON.parse(templateData);
      return {
        success: true,
        data: template
      };
    } catch (error) {
      console.error('Failed to get template:', error);
      return {
        success: false,
        error: 'Failed to get template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, updateData: Partial<UpdateTemplateRequest>): Promise<ApiResponse<OCRTemplate>> {
    try {
      const key = `template:${templateId}`;
      const templateData = await this.redis.get(key);
      
      if (!templateData) {
        return {
          success: false,
          error: 'Template not found',
          message: `Template ${templateId} does not exist`
        };
      }

      const template: OCRTemplate = JSON.parse(templateData);
      
      // Update fields
      if (updateData.name) template.name = updateData.name;
      if (updateData.description !== undefined) template.description = updateData.description;
      if (updateData.template) template.template = updateData.template;
      if (updateData.isDefault !== undefined) {
        if (updateData.isDefault && !template.isDefault) {
          // When setting as default template, first clear other default templates
          await this.clearDefaultTemplates(template.module);
          await this.redis.set(`template:default:${template.module}`, templateId);
        } else if (!updateData.isDefault && template.isDefault) {
          // Cancel default template
          await this.redis.del(`template:default:${template.module}`);
        }
        template.isDefault = updateData.isDefault;
      }
      
      template.updatedAt = new Date().toISOString();

      // Save updates
      await this.redis.set(key, JSON.stringify(template));

      console.log(`Template updated successfully: ${template.name} (${templateId})`);
      return {
        success: true,
        data: template,
        message: `Template updated successfully`
      };
    } catch (error) {
      console.error('Failed to update template:', error);
      return {
        success: false,
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<ApiResponse<boolean>> {
    try {
      const key = `template:${templateId}`;
      const templateData = await this.redis.get(key);
      
      if (!templateData) {
        return {
          success: false,
          error: 'Template not found',
          message: `Template ${templateId} does not exist`
        };
      }

      const template: OCRTemplate = JSON.parse(templateData);
      
      // Delete template
      await this.redis.del(key);
      
      // Remove from module index
      await this.redis.srem(`templates:${template.module}`, templateId);
      
      // If it's a default template, clear default index
      if (template.isDefault) {
        await this.redis.del(`template:default:${template.module}`);
      }

      console.log(`Template deleted successfully: ${template.name} (${templateId})`);
      return {
        success: true,
        data: true,
        message: `Template deleted successfully`
      };
    } catch (error) {
      console.error('Failed to delete template:', error);
      return {
        success: false,
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set default template
   */
  async setDefaultTemplate(templateId: string): Promise<ApiResponse<OCRTemplate>> {
    try {
      const result = await this.getTemplateById(templateId);
      if (!result.success || !result.data) {
        return result;
      }

      const template = result.data;
      
      // Clear other default templates in the same module
      await this.clearDefaultTemplates(template.module);
      
      // Set as default template
      template.isDefault = true;
      template.updatedAt = new Date().toISOString();
      
      const key = `template:${templateId}`;
      await this.redis.setex(key, 86400 * 365, JSON.stringify(template));
      await this.redis.set(`template:default:${template.module}`, templateId);

      console.log(`Default template set successfully: ${template.name} (${templateId})`);
      return {
        success: true,
        data: template,
        message: `Default template set successfully`
      };
    } catch (error) {
      console.error('Failed to set default template:', error);
      return {
        success: false,
        error: 'Failed to set default template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get default template for module
   */
  async getDefaultTemplate(module: string): Promise<ApiResponse<OCRTemplate>> {
    try {
      const defaultTemplateId = await this.redis.get(`template:default:${module}`);
      
      if (!defaultTemplateId) {
        return {
          success: false,
          error: 'Default template not found',
          message: `Module ${module} has no default template set`
        };
      }

      return await this.getTemplateById(defaultTemplateId);
    } catch (error) {
      console.error('Failed to get default template:', error);
      return {
        success: false,
        error: 'Failed to get default template',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default new TemplateService();