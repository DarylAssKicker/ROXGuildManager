import Redis from 'ioredis';
import { KVMInfo, KVMMemberData, ApiResponse } from '../types';

class KVMService {
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
      console.log('Redis connection successful');
    });
  }

  /**
   * Import KVM data to Redis
   */
  async importKVMData(userId: string, kvmData: KVMInfo[]): Promise<ApiResponse<{ imported: number; total: number }>> {
    try {
      console.log('Starting KVM data import:', kvmData);
      let importedCount = 0;
      const totalCount = kvmData.length;

      // Test Redis connection
      try {
        await this.redis.ping();
        console.log('Redis connection normal');
      } catch (redisError) {
        console.error('Redis connection failed:', redisError);
        return {
          success: false,
          error: 'Redis connection failed',
          message: 'Please confirm Redis server is started'
        };
      }

      for (const kvmInfo of kvmData) {
        console.log('Processing KVM data:', kvmInfo);
        
        // Validate data format
        if (!this.validateKVMInfo(kvmInfo)) {
          console.warn(`Skipping invalid KVM data:`, kvmInfo);
          continue;
        }

        // Use user ID and date as key to store KVM data
        const key = `rox_guild:user:${userId}:kvm:${kvmInfo.date}`;
        
        // Store KVM data to Redis
        await this.redis.setex(key, 86400 * 365, JSON.stringify(kvmInfo)); // Save for 1 year
        
        // Add to user's date index
        await this.redis.zadd(`rox_guild:user:${userId}:kvm:dates`, new Date(kvmInfo.date).getTime(), kvmInfo.date);
        
        importedCount++;
        console.log(`Successfully imported KVM data: ${kvmInfo.date}`);
      }

      console.log(`Import completed: ${importedCount}/${totalCount}`);
      return {
        success: true,
        data: {
          imported: importedCount,
          total: totalCount
        },
        message: `Successfully imported ${importedCount}/${totalCount} KVM records`
      };
    } catch (error) {
      console.error('Failed to import KVM data:', error);
      return {
        success: false,
        error: 'Failed to import KVM data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get KVM data for specified date
   */
  async getKVMDataByDate(userId: string, date: string): Promise<ApiResponse<KVMInfo>> {
    try {
      const key = `rox_guild:user:${userId}:kvm:${date}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return {
          success: false,
          error: 'KVM data not found for specified date',
          message: `KVM data not found for ${date}`
        };
      }

      const kvmInfo: KVMInfo = JSON.parse(data);
      return {
        success: true,
        data: kvmInfo
      };
    } catch (error) {
      console.error('Failed to get KVM data:', error);
      return {
        success: false,
        error: 'Failed to get KVM data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get KVM data within date range
   */
  async getKVMDataByDateRange(userId: string, startDate: string, endDate: string): Promise<ApiResponse<KVMInfo[]>> {
    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();
      
      // Get all dates within date range
      const dates = await this.redis.zrangebyscore(`rox_guild:user:${userId}:kvm:dates`, startTimestamp, endTimestamp);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No KVM data found in specified date range'
        };
      }

      const kvmDataList: KVMInfo[] = [];
      
      for (const date of dates) {
        const key = `rox_guild:user:${userId}:kvm:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          kvmDataList.push(JSON.parse(data));
        }
      }

      return {
        success: true,
        data: kvmDataList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      };
    } catch (error) {
      console.error('Failed to get KVM data range:', error);
      return {
        success: false,
        error: 'Failed to get KVM data range',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get date list of all KVM data
   */
  async getAllKVMDates(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const dates = await this.redis.zrange(`rox_guild:user:${userId}:kvm:dates`, 0, -1);
      return {
        success: true,
        data: dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      };
    } catch (error) {
      console.error('Failed to get KVM date list:', error);
      return {
        success: false,
        error: 'Failed to get KVM date list',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete KVM data for specified date
   */
  async deleteKVMData(userId: string, date: string): Promise<ApiResponse<boolean>> {
    try {
      const key = `rox_guild:user:${userId}:kvm:${date}`;
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        // Remove from date index
        await this.redis.zrem(`rox_guild:user:${userId}:kvm:dates`, date);
        return {
          success: true,
          data: true,
          message: `Successfully deleted KVM data for ${date}`
        };
      } else {
        return {
          success: false,
          error: 'KVM data not found for specified date',
          message: `KVM data not found for ${date}`
        };
      }
    } catch (error) {
      console.error('Failed to delete KVM data:', error);
      return {
        success: false,
        error: 'Failed to delete KVM data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get KVM data statistics
   */
  async getKVMStatistics(userId: string): Promise<ApiResponse<{
    totalRecords: number;
    dateRange: { start: string; end: string } | null;
    totalParticipants: number;
    totalNonParticipants: number;
    averageParticipants: number;
  }>> {
    try {
      const dates = await this.redis.zrange(`rox_guild:user:${userId}:kvm:dates`, 0, -1);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            dateRange: null,
            totalParticipants: 0,
            totalNonParticipants: 0,
            averageParticipants: 0
          }
        };
      }

      let totalParticipants = 0;
      let totalNonParticipants = 0;
      const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // Calculate total participants and non-participants
      for (const date of dates) {
        const key = `rox_guild:user:${userId}:kvm:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          const kvmInfo: KVMInfo = JSON.parse(data);
          // KVM only records non-participants, not total_participants
          // Can calculate participant count as needed
          totalNonParticipants += kvmInfo.non_participants?.length || 0;
        }
      }

      return {
        success: true,
        data: {
          totalRecords: dates.length,
          dateRange: {
            start: sortedDates[0] || '',
            end: sortedDates[sortedDates.length - 1] || ''
          },
          totalParticipants,
          totalNonParticipants,
          averageParticipants: dates.length > 0 ? Math.round(totalParticipants / dates.length) : 0
        }
      };
    } catch (error) {
      console.error('Failed to get KVM statistics:', error);
      return {
        success: false,
        error: 'Failed to get KVM statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate KVMInfo data format
   */
  private validateKVMInfo(kvmInfo: any): kvmInfo is KVMInfo {
    if (!kvmInfo || typeof kvmInfo.date !== 'string' || typeof kvmInfo.event_type !== 'string') {
      return false;
    }
    
    // Validate non_participants is array
    if (!Array.isArray(kvmInfo.non_participants)) {
      return false;
    }
    
    // Validate each member has name field
    return kvmInfo.non_participants.every((member: any) => 
      typeof member.name === 'string'
    );
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default new KVMService();