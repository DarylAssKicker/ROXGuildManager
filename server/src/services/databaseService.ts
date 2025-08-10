import Redis from 'ioredis';
import { GuildMember, Group, Party, User, GuildNameResource, UpdateGuildNameRequest } from '../types';

export interface DatabaseConfig {
  host: string;
  port: number;
  password?: string | undefined;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
}

export interface DatabaseStats {
  connected: boolean;
  totalKeys: number;
  memoryUsage: string;
  lastPing: number;
}

export class DatabaseService {
  private redis: Redis | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<boolean> {
    try {
      const redisOptions: any = {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db || 0,
        keyPrefix: this.config.keyPrefix || 'rox_guild:',
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > this.maxReconnectAttempts) {
            return null; // Stop reconnection
          }
          return Math.min(times * 1000, 10000); // Exponential backoff, max 10 seconds
        }
      };

      if (this.config.password) {
        redisOptions.password = this.config.password;
      }

      this.redis = new Redis(redisOptions);

      // Listen to connection events
      this.redis.on('connect', () => {
        console.log('✅ Redis connection successful');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.redis.on('error', (error: Error) => {
        console.error('❌ Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.reconnectAttempts++;
      });

      // Establish connection
      await this.redis.connect();
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      this.isConnected = false;
    }
  }

  /**
   * Check connection status
   */
  isDatabaseConnected(): boolean {
    return this.isConnected && this.redis !== null;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.redis) {
      return {
        connected: false,
        totalKeys: 0,
        memoryUsage: '0',
        lastPing: 0
      };
    }

    try {
      const [totalKeys, memoryUsage] = await Promise.all([
        this.redis.dbsize(),
        this.redis.memory('STATS')
      ]);

      return {
        connected: this.isConnected,
        totalKeys: totalKeys || 0,
        memoryUsage: memoryUsage ? `${Math.round(Number(memoryUsage) / 1024)}KB` : '0',
        lastPing: Date.now()
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      return {
        connected: this.isConnected,
        totalKeys: 0,
        memoryUsage: '0',
        lastPing: 0
      };
    }
  }

  // ==================== Guild Member Data Management ====================

  /**
   * Save guild member data (user level)
   */
  async saveGuildMembers(userId: string, members: GuildMember[]): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:members`;
      const data = JSON.stringify(members);
      
      await this.redis.set(key, data); // No expiration time, user data is permanently saved
      
      console.log(`✅ Saved ${members.length} guild member data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to save guild member data:', error);
      return false;
    }
  }

  /**
   * Get guild member data (user level)
   */
  async getGuildMembers(userId: string): Promise<GuildMember[]> {
    if (!this.redis) return [];

    try {
      const key = `user:${userId}:guild:members`;
      const data = await this.redis.get(key);
      
      if (data) {
        const members = JSON.parse(data) as GuildMember[];
        // console.log(`📖 Retrieved ${members.length} guild member data for user ${userId}`);
        return members;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get guild member data:', error);
      return [];
    }
  }

  /**
   * Delete guild member data (user level)
   */
  async deleteGuildMembers(userId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:members`;
      
      await this.redis.del(key);
      console.log(`🗑️ Deleted guild member data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete guild member data:', error);
      return false;
    }
  }

  /**
   * Update single guild member (user level)
   */
  async updateGuildMember(userId: string, memberName: string, memberData: Partial<GuildMember>): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const members = await this.getGuildMembers(userId);
      const memberIndex = members.findIndex(m => m.name === memberName);
      
      if (memberIndex !== -1) {
        const currentMember = members[memberIndex]!;
        const updatedMember: GuildMember = { 
          ...currentMember, 
          ...memberData,
          name: memberData.name || currentMember.name
        };
        members[memberIndex] = updatedMember;
        return await this.saveGuildMembers(userId, members);
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update guild member:', error);
      return false;
    }
  }

  // ==================== OCR Result Cache ====================

  /**
   * Save OCR result
   */
  async saveOCRResult(sessionId: string, result: any): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `ocr:${sessionId}`;
      const data = JSON.stringify(result);
      
      await this.redis.setex(key, 3600, data); // Expires in 1 hour
      console.log(`✅ Saved OCR result: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to save OCR result:', error);
      return false;
    }
  }

  /**
   * Get OCR result
   */
  async getOCRResult(sessionId: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const key = `ocr:${sessionId}`;
      const data = await this.redis.get(key);
      
      if (data) {
        const result = JSON.parse(data);
        console.log(`📖 Retrieved OCR result: ${sessionId}`);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get OCR result:', error);
      return null;
    }
  }

  // ==================== Cache Management ====================

  /**
   * Set cache
   */
  async setCache(key: string, value: any, expireSeconds: number = 3600): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const cacheKey = `cache:${key}`;
      const jsonValue = JSON.stringify(value);
      
      await this.redis.setex(cacheKey, expireSeconds, jsonValue);
      return true;
    } catch (error) {
      console.error('Cache operation failed:', error);
      return false;
    }
  }

  /**
   * Get cache
   */
  async getCache(key: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const cacheKey = `cache:${key}`;
      const data = await this.redis.get(cacheKey);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('Cache operation failed:', error);
      return null;
    }
  }

  /**
   * Delete cache
   */
  async deleteCache(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const cacheKey = `cache:${key}`;
      await this.redis.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache operation failed:', error);
      return false;
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Clear all data (use with caution)
   */
  async clearAll(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.flushdb();
      console.log('🗑️ Cleared all database data');
      return true;
    } catch (error) {
      console.error('Failed to clear database:', error);
      return false;
    }
  }

  /**
   * Get all guild IDs
   */
  async getAllGuildIds(): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const keys = await this.redis.keys('guild:*:members');
      return keys.map(key => key.split(':')[1]).filter(id => id !== undefined) as string[];
    } catch (error) {
      console.error('Failed to get all guild IDs:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // ==================== Group Data Management (User Level) ====================

  /**
   * Save group data (user level)
   */
  async saveGroups(userId: string, groups: Group[]): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:groups`;
      const data = JSON.stringify(groups);
      
      await this.redis.set(key, data); // User data is permanently saved
      
      console.log(`✅ Saved ${groups.length} group data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to save group data:', error);
      return false;
    }
  }

  /**
   * Get group data (user level)
   */
  async getGroups(userId: string): Promise<Group[]> {
    if (!this.redis) return [];

    try {
      const key = `user:${userId}:guild:groups`;
      const data = await this.redis.get(key);
      
      if (data) {
        const groups = JSON.parse(data) as Group[];
        console.log(`📖 Retrieved ${groups.length} group data for user ${userId}`);
        return groups;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get group data:', error);
      return [];
    }
  }

  /**
   * Delete group data (user level)
   */
  async deleteGroups(userId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:groups`;
      await this.redis.del(key);
      
      console.log(`🗑️ Deleted all group data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete group data:', error);
      return false;
    }
  }

  // ==================== Party Data Management ====================

  /**
   * Save party data (user level)
   */
  async saveParties(userId: string, parties: Party[]): Promise<boolean> {
    if (!this.redis) return false;

    try {
      // Group by type
      const kvmParties = parties.filter(party => party.type === 'kvm');
      const gvgParties = parties.filter(party => party.type === 'gvg');
      
      // Save to different keys separately
      const kvmKey = `user:${userId}:guild:parties:kvm`;
      const gvgKey = `user:${userId}:guild:parties:gvg`;
      
      await this.redis.set(kvmKey, JSON.stringify(kvmParties)); // User data is permanently saved
        await this.redis.set(gvgKey, JSON.stringify(gvgParties)); // User data is permanently saved
      
      console.log(`✅ Saved ${kvmParties.length} KVM party data and ${gvgParties.length} GVG party data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to save party data:', error);
      return false;
    }
  }

  /**
   * Get party data (user level)
   */
  async getParties(userId: string): Promise<Party[]> {
    if (!this.redis) return [];

    try {
      const kvmKey = `user:${userId}:guild:parties:kvm`;
      const gvgKey = `user:${userId}:guild:parties:gvg`;
      
      const [kvmData, gvgData] = await Promise.all([
        this.redis.get(kvmKey),
        this.redis.get(gvgKey)
      ]);
      
      const kvmParties = kvmData ? JSON.parse(kvmData) as Party[] : [];
      const gvgParties = gvgData ? JSON.parse(gvgData) as Party[] : [];
      
      const allParties = [...kvmParties, ...gvgParties];
      // console.log(`📖 Retrieved ${kvmParties.length} KVM parties and ${gvgParties.length} GVG parties for user ${userId}`);
      return allParties;
    } catch (error) {
      console.error('Failed to get party data:', error);
      return [];
    }
  }

  /**
   * Get party data by type (user level)
   */
  async getPartiesByType(userId: string, type: string): Promise<Party[]> {
    if (!this.redis) return [];

    try {
      const key = type === 'kvm' ? `user:${userId}:guild:parties:kvm` : `user:${userId}:guild:parties:gvg`;
      const data = await this.redis.get(key);
      
      if (data) {
        const parties = JSON.parse(data) as Party[];
        return parties;
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to get ${type} party data for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Delete party data (user level)
   */
  async deleteParties(userId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const kvmKey = `user:${userId}:guild:parties:kvm`;
      const gvgKey = `user:${userId}:guild:parties:gvg`;
      
      await Promise.all([
        this.redis.del(kvmKey),
        this.redis.del(gvgKey)
      ]);
      
      console.log(`🗑️ Deleted all KVM and GVG party data for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete party data:', error);
      return false;
    }
  }

  // ==================== AA Data Management (User Level) ====================

  /**
   * Save AA data
   */
  async saveAAData(userId: string, date: string, data: any): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:aa:${date}`;
      await this.redis.set(key, JSON.stringify(data));
      
      // Update AA date list
      await this.addAADate(userId, date);
      
      console.log(`✅ Saved AA data for user ${userId}: ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to save AA data:', error);
      return false;
    }
  }

  /**
   * Get AA data
   */
  async getAAData(userId: string, date: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const key = `user:${userId}:aa:${date}`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get AA data:', error);
      return null;
    }
  }

  /**
   * Get AA date list
   */
  async getAADates(userId: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const key = `user:${userId}:aa:dates`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data) as string[];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get AA date list:', error);
      return [];
    }
  }

  /**
   * Add AA date
   */
  private async addAADate(userId: string, date: string): Promise<boolean> {
    try {
      const dates = await this.getAADates(userId);
      if (!dates.includes(date)) {
        dates.push(date);
        dates.sort(); // Keep dates sorted
        
        const key = `user:${userId}:aa:dates`;
        await this.redis!.set(key, JSON.stringify(dates));
      }
      return true;
    } catch (error) {
      console.error('Failed to add AA date:', error);
      return false;
    }
  }

  // ==================== GVG Data Management (User Level) ====================

  /**
   * Save GVG data
   */
  async saveGVGData(userId: string, date: string, data: any): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:gvg:${date}`;
      await this.redis.set(key, JSON.stringify(data));
      
      // Update GVG date list
      await this.addGVGDate(userId, date);
      
      console.log(`✅ Saved GVG data for user ${userId}: ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to save GVG data:', error);
      return false;
    }
  }

  /**
   * Get GVG data
   */
  async getGVGData(userId: string, date: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const key = `user:${userId}:gvg:${date}`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get GVG data:', error);
      return null;
    }
  }

  /**
   * Get GVG date list
   */
  async getGVGDates(userId: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const key = `user:${userId}:gvg:dates`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data) as string[];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get GVG date list:', error);
      return [];
    }
  }

  /**
   * Add GVG date
   */
  private async addGVGDate(userId: string, date: string): Promise<boolean> {
    try {
      const dates = await this.getGVGDates(userId);
      if (!dates.includes(date)) {
        dates.push(date);
        dates.sort(); // Keep dates sorted
        
        const key = `user:${userId}:gvg:dates`;
        await this.redis!.set(key, JSON.stringify(dates));
      }
      return true;
    } catch (error) {
      console.error('Failed to add GVG date:', error);
      return false;
    }
  }

  // ==================== KVM Data Management (User Level) ====================

  /**
   * Save KVM data
   */
  async saveKVMData(userId: string, date: string, data: any): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:kvm:${date}`;
      await this.redis.set(key, JSON.stringify(data));
      
      // Update KVM date list
      await this.addKVMDate(userId, date);
      
      console.log(`✅ Saved KVM data for user ${userId}: ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to save KVM data:', error);
      return false;
    }
  }

  /**
   * Get KVM data
   */
  async getKVMData(userId: string, date: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const key = `user:${userId}:kvm:${date}`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get KVM data:', error);
      return null;
    }
  }

  /**
   * Get KVM date list
   */
  async getKVMDates(userId: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const key = `user:${userId}:kvm:dates`;
      const data = await this.redis.get(key);
      
      if (data) {
        return JSON.parse(data) as string[];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get KVM date list:', error);
      return [];
    }
  }

  /**
   * Add KVM date
   */
  private async addKVMDate(userId: string, date: string): Promise<boolean> {
    try {
      const dates = await this.getKVMDates(userId);
      if (!dates.includes(date)) {
        dates.push(date);
        dates.sort(); // Keep dates sorted
        
        const key = `user:${userId}:kvm:dates`;
        await this.redis!.set(key, JSON.stringify(dates));
      }
      return true;
    } catch (error) {
      console.error('Failed to add KVM date:', error);
      return false;
    }
  }

  // ==================== User Data Management ====================

  /**
   * Save user data
   */
  async setUser(user: User): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${user.id}`;
      await this.redis.set(key, JSON.stringify(user));
      console.log(`💾 Saved user data: ${user.username}`);
      return true;
    } catch (error) {
      console.error('Failed to save user data:', error);
      return false;
    }
  }

  /**
   * Get user data
   */
  async getUser(userId: string): Promise<User | null> {
    if (!this.redis) return null;

    try {
      const key = `user:${userId}`;
      const data = await this.redis.get(key);
      
      if (data) {
        const user = JSON.parse(data) as User;
        console.log(`📖 Retrieved user data: ${user.username}`);
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    if (!this.redis) return [];

    try {
      // Create a Redis connection without keyPrefix to query all user keys
      const Redis = require('ioredis');
      const redisNoPrefix = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest
      });
      
      try {
        // Find all user basic info keys (excluding sub-data)
        const pattern = `${this.config.keyPrefix || 'rox_guild:'}user:*`;
        const allKeys = await redisNoPrefix.keys(pattern);
        
        // Filter out keys that are only user basic info (excluding colon-separated sub-keys)
        const userKeys = allKeys.filter((key: string) => {
          // Check format after removing prefix
          const keyWithoutPrefix = key.replace(this.config.keyPrefix || 'rox_guild:', '');
          // User basic info key format should be 'user:uuid', should not contain more colons
          const parts = keyWithoutPrefix.split(':');
          return parts.length === 2 && parts[0] === 'user';
        });
        
        console.log(`🔍 Found ${userKeys.length} user basic info keys, total keys: ${allKeys.length}`);
        
        if (userKeys.length === 0) {
          await redisNoPrefix.disconnect();
          return [];
        }
        
        // Get user data
        const userData = await redisNoPrefix.mget(userKeys);
        const users: User[] = [];
        
        for (const data of userData) {
          if (data) {
            try {
              const parsed = JSON.parse(data);
              // Ensure parsed data is a user object (contains necessary user fields)
              if (parsed && typeof parsed === 'object' && parsed.id && parsed.username && parsed.role) {
                users.push(parsed as User);
              }
            } catch (parseError) {
              console.error('Failed to parse user data:', parseError);
            }
          }
        }
        
        await redisNoPrefix.disconnect();
        console.log(`📖 Retrieved ${users.length} user data`);
        return users;
      } catch (innerError) {
        await redisNoPrefix.disconnect();
        throw innerError;
      }
    } catch (error) {
      console.error('Failed to get all user data:', error);
      return [];
    }
  }

  /**
   * Delete user data
   */
  async deleteUser(userId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}`;
      await this.redis.del(key);
      console.log(`🗑️ Deleted user data: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      return false;
    }
  }

  // ==================== Guild Name Resource Management (User Level) ====================

  /**
   * Save guild name resource (user level)
   */
  async saveGuildNameResource(userId: string, guildNameResource: GuildNameResource): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:name`;
      const data = JSON.stringify(guildNameResource);
      
      await this.redis.set(key, data); // User data is permanently saved
      
      console.log(`✅ Saved guild name resource for user ${userId}: ${guildNameResource.guildName}`);
      return true;
    } catch (error) {
      console.error('Guild name resource operation failed:', error);
      return false;
    }
  }

  /**
   * Get guild name resource (user level)
   */
  async getGuildNameResource(userId: string): Promise<GuildNameResource | null> {
    if (!this.redis) return null;

    try {
      const key = `user:${userId}:guild:name`;
      const data = await this.redis.get(key);
      
      if (data) {
        const rawData = JSON.parse(data);
        // Ensure returned data conforms to new GuildNameResource type definition, remove displayName field
        const guildNameResource: GuildNameResource = {
          guildId: rawData.guildId,
          guildName: rawData.guildName,
          description: rawData.description || '',
          backgroundImage: rawData.backgroundImage || '',
          createdAt: rawData.createdAt,
          updatedAt: rawData.updatedAt
        };
        console.log(`📖 Retrieved guild name resource for user ${userId}: ${guildNameResource.guildName}`);
        return guildNameResource;
      }
      
      // If not found, return default guild name resource
      const defaultGuildNameResource: GuildNameResource = {
        guildId: userId,
        guildName: 'ROXGuild',
        description: 'Default Guild',
        backgroundImage: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save default value
      await this.saveGuildNameResource(userId, defaultGuildNameResource);
      return defaultGuildNameResource;
    } catch (error) {
      console.error('Guild name resource operation failed:', error);
      return null;
    }
  }

  /**
   * Update guild name resource (user level)
   */
  async updateGuildNameResource(userId: string, updateData: UpdateGuildNameRequest): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const existingResource = await this.getGuildNameResource(userId);
      if (!existingResource) {
        return false;
      }

      const updatedResource: GuildNameResource = {
        ...existingResource,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      return await this.saveGuildNameResource(userId, updatedResource);
    } catch (error) {
      console.error('Guild name resource operation failed:', error);
      return false;
    }
  }

  /**
   * Delete guild name resource (user level)
   */
  async deleteGuildNameResource(userId: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const key = `user:${userId}:guild:name`;
      
      await this.redis.del(key);
      console.log(`🗑️ Deleted guild name resource for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Guild name resource operation failed:', error);
      return false;
    }
  }

  /**
   * Get all guild name resources
   */
  async getAllGuildNameResources(): Promise<GuildNameResource[]> {
    if (!this.redis) return [];

    try {
      const pattern = 'user:*:guild:name';
      const keys = await this.redis.keys(pattern);
      const resources: GuildNameResource[] = [];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          try {
            const rawData = JSON.parse(data);
            // Ensure returned data conforms to new GuildNameResource type definition, remove displayName field
            const resource: GuildNameResource = {
              guildId: rawData.guildId,
              guildName: rawData.guildName,
              description: rawData.description || '',
              backgroundImage: rawData.backgroundImage || '',
              createdAt: rawData.createdAt,
              updatedAt: rawData.updatedAt
            };
            resources.push(resource);
          } catch (parseError) {
            console.error(`Failed to parse guild name resource ${key}:`, parseError);
          }
        }
      }
      
      console.log(`📖 Retrieved all guild name resources: ${resources.length} items`);
      return resources;
    } catch (error) {
      console.error('Guild name resource operation failed:', error);
      return [];
    }
  }

  // ==================== General Data Management ====================

  /**
   * Set general data (for storing refresh tokens, etc.)
   */
  async setData(key: string, value: string, expireSeconds?: number): Promise<boolean> {
    if (!this.redis) return false;

    try {
      if (expireSeconds) {
        await this.redis.setex(key, expireSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Data operation failed:', error);
      return false;
    }
  }

  /**
   * Get general data
   */
  async getData(key: string): Promise<string | null> {
    if (!this.redis) return null;

    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Data operation failed:', error);
      return null;
    }
  }

  /**
   * Delete general data
   */
  async deleteData(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Data operation failed:', error);
      return false;
    }
  }
}

// Create default database service instance
const dbConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'rox_guild:',
  maxRetriesPerRequest: 3
};

console.log('🔧 Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  db: dbConfig.db,
  hasPassword: !!dbConfig.password
});

export const databaseService = new DatabaseService(dbConfig);