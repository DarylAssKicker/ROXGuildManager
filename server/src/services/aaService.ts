import Redis from 'ioredis';
import { AAInfo, AAMemberData, ApiResponse } from '../types';
import { authService } from './authService';

class AAService {
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
   * Get actual data storage user ID
   */
  private async getDataUserId(requestUserId: string): Promise<string> {
    const user = await authService.getUserById(requestUserId);
    if (!user) {
      throw new Error('User not found');
    }
    return authService.getDataUserId(user);
  }

  /**
   * Import AA data to Redis
   */
  async importAAData(requestUserId: string, aaData: AAInfo[]): Promise<ApiResponse<{ imported: number; total: number }>> {
    try {
      console.log('Starting AA data import:', aaData);
      let importedCount = 0;
      const totalCount = aaData.length;

      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);

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

      for (const aaInfo of aaData) {
        console.log('Processing AA data:', aaInfo);
        
        // Validate data format
        if (!this.validateAAInfo(aaInfo)) {
          console.warn(`Skipping invalid AA data:`, aaInfo);
          continue;
        }

        // Use data user ID and date as key to store AA data
        const key = `rox_guild:user:${dataUserId}:aa:${aaInfo.date}`;
        
        // Store AA data to Redis
        await this.redis.set(key, JSON.stringify(aaInfo)); // Persistent storage
        
        // Add to user's date index
        await this.redis.zadd(`rox_guild:user:${dataUserId}:aa:dates`, new Date(aaInfo.date).getTime(), aaInfo.date);
        
        importedCount++;
        console.log(`Successfully imported AA data: ${aaInfo.date}`);
      }

      console.log(`Import completed: ${importedCount}/${totalCount}`);
      return {
        success: true,
        data: {
          imported: importedCount,
          total: totalCount
        },
        message: `Successfully imported ${importedCount}/${totalCount} AA records`
      };
    } catch (error) {
      console.error('Failed to import AA data:', error);
      return {
        success: false,
        error: 'Failed to import AA data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get AA data for specified date
   */
  async getAADataByDate(requestUserId: string, date: string): Promise<ApiResponse<AAInfo>> {
    try {
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      const key = `rox_guild:user:${dataUserId}:aa:${date}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return {
          success: false,
          error: 'AA data not found for specified date',
          message: `AA data not found for ${date}`
        };
      }

      const aaInfo: AAInfo = JSON.parse(data);
      return {
        success: true,
        data: aaInfo
      };
    } catch (error) {
      console.error('Failed to get AA data:', error);
      return {
        success: false,
        error: 'Failed to get AA data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get AA data within date range
   */
  async getAADataByDateRange(requestUserId: string, startDate: string, endDate: string): Promise<ApiResponse<AAInfo[]>> {
    try {
      // Fix date order - ensure startDate is earlier than endDate
      const start = new Date(startDate);
      const end = new Date(endDate);
      const minTimestamp = Math.min(start.getTime(), end.getTime());
      const maxTimestamp = Math.max(start.getTime(), end.getTime());
      
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      
      // Get all dates within user's date range (corrected range)
      const dates = await this.redis.zrangebyscore(`rox_guild:user:${dataUserId}:aa:dates`, minTimestamp, maxTimestamp);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No AA data found in specified date range'
        };
      }

      const aaDataList: AAInfo[] = [];
      
      for (const date of dates) {
        const key = `rox_guild:user:${dataUserId}:aa:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          aaDataList.push(JSON.parse(data));
        }
      }

      return {
        success: true,
        data: aaDataList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by newest first
      };
    } catch (error) {
      console.error('Failed to get AA data range:', error);
      return {
        success: false,
        error: 'Failed to get AA data range',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get date list of all AA data
   */
  async getAllAADates(requestUserId: string): Promise<ApiResponse<string[]>> {
    try {
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      const dates = await this.redis.zrange(`rox_guild:user:${dataUserId}:aa:dates`, 0, -1);
      return {
        success: true,
        data: dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      };
    } catch (error) {
      console.error('Failed to get AA date list:', error);
      return {
        success: false,
        error: 'Failed to get AA date list',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete AA data for specified date
   */
  async deleteAAData(requestUserId: string, date: string): Promise<ApiResponse<boolean>> {
    try {
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      const key = `rox_guild:user:${dataUserId}:aa:${date}`;
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        // Remove from user's date index
        await this.redis.zrem(`rox_guild:user:${dataUserId}:aa:dates`, date);
        return {
          success: true,
          data: true,
          message: `Successfully deleted AA data for ${date}`
        };
      } else {
        return {
          success: false,
          error: 'AA data not found for specified date',
          message: `AA data not found for ${date}`
        };
      }
    } catch (error) {
      console.error('Failed to delete AA data:', error);
      return {
        success: false,
        error: 'Failed to delete AA data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get AA data statistics
   */
  async getAAStatistics(requestUserId: string): Promise<ApiResponse<{
    totalRecords: number;
    dateRange: { start: string; end: string } | null;
    totalParticipants: number;
  }>> {
    try {
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      const dates = await this.redis.zrange(`rox_guild:user:${dataUserId}:aa:dates`, 0, -1);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            dateRange: null,
            totalParticipants: 0
          }
        };
      }

      let totalParticipants = 0;
      const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // Calculate total participants
      for (const date of dates) {
        const key = `rox_guild:user:${dataUserId}:aa:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          const aaInfo: AAInfo = JSON.parse(data);
          totalParticipants += aaInfo.participants?.length || 0;
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
          totalParticipants
        }
      };
    } catch (error) {
      console.error('Failed to get AA statistics:', error);
      return {
        success: false,
        error: 'Failed to get AA statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate AAInfo data format
   */
  private validateAAInfo(aaInfo: any): aaInfo is AAInfo {
    if (!aaInfo || typeof aaInfo.date !== 'string' || !Array.isArray(aaInfo.participants)) {
      return false;
    }
    
    // If no total_participants field, automatically set to participants array length
    if (typeof aaInfo.total_participants !== 'number') {
      aaInfo.total_participants = aaInfo.participants.length;
    }
    
    return aaInfo.participants.every((member: any) => 
      typeof member.name === 'string'
    );
  }

  /**
   * Get member AA participation status (recent 5 times)
   */
  async getMemberAAParticipation(requestUserId: string, memberName: string): Promise<ApiResponse<{ [date: string]: boolean }>> {
    try {
      // Get all AA dates
      const datesResult = await this.getAllAADates(requestUserId);
      if (!datesResult.success || !datesResult.data) {
        return {
          success: true,
          data: {},
          message: 'No AA data available'
        };
      }

      // Get recent 5 AA dates
      const recentDates = datesResult.data.slice(-5);
      const participation: { [date: string]: boolean } = {};

      // Check participation status for each date
      for (const date of recentDates) {
        const aaDataResult = await this.getAADataByDate(requestUserId, date);
        if (aaDataResult.success && aaDataResult.data) {
          const participants = aaDataResult.data.participants || [];
          participation[date] = participants.some(p => p.name === memberName);
        } else {
          participation[date] = false;
        }
      }

      return {
        success: true,
        data: participation,
        message: 'Successfully retrieved member AA participation'
      };
    } catch (error) {
      console.error('Failed to get member AA participation:', error);
      return {
        success: false,
        error: 'Failed to get member AA participation',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all members' AA participation status in one request
   */
  async getAllMembersAAParticipation(requestUserId: string, limit?: number): Promise<ApiResponse<{ [memberName: string]: { [date: string]: boolean } }>> {
    try {
      // Import guild service to get complete member list
      const guildService = require('./guildService').default;
      
      // Get actual data storage user ID
      const dataUserId = await this.getDataUserId(requestUserId);
      
      // Get all guild members
      const allGuildMembers = await guildService.getAllMembers(dataUserId);
      console.log('🔍 AA getAllMembers response:', { memberCount: allGuildMembers.length });
      
      // Get all AA dates
      const datesResult = await this.getAllAADates(requestUserId);
      if (!datesResult.success || !datesResult.data) {
        return {
          success: true,
          data: {},
          message: 'No AA data available'
        };
      }

      // Get recent dates (default to last 5 for AA)
      const recentDates = limit ? datesResult.data.slice(-limit) : datesResult.data.slice(-5);
      console.log('🔍 AA recent dates:', recentDates);
      
      const allParticipation: { [memberName: string]: { [date: string]: boolean } } = {};

      // Initialize all guild members in participation data
      allGuildMembers.forEach((member: any) => {
        const memberName = member.name || member.memberName;
        if (memberName) {
          allParticipation[memberName] = {};
          recentDates.forEach(date => {
            allParticipation[memberName]![date] = false;
          });
        }
      });

      // Update participation data for actual participants
      for (const date of recentDates) {
        const aaDataResult = await this.getAADataByDate(requestUserId, date);
        if (aaDataResult.success && aaDataResult.data) {
          const participants = aaDataResult.data.participants || [];
          
          // Mark participants as true for this date
          participants.forEach(p => {
            if (allParticipation[p.name]) {
              allParticipation[p.name]![date] = true;
            } else {
              // Add participant not in guild member list
              console.log(`🔍 AA participant ${p.name} not found in guild members, adding`);
              allParticipation[p.name] = {};
              recentDates.forEach(d => {
                allParticipation[p.name]![d] = d === date;
              });
            }
          });
        }
      }

      return {
        success: true,
        data: allParticipation,
        message: `Successfully retrieved AA participation for ${Object.keys(allParticipation).length} members`
      };
    } catch (error) {
      console.error('Failed to get all members AA participation:', error);
      return {
        success: false,
        error: 'Failed to get all members AA participation',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get specific members' AA participation status
   */
  async getMembersAAParticipation(requestUserId: string, memberNames: string[], limit?: number): Promise<ApiResponse<{ [memberName: string]: { [date: string]: boolean } }>> {
    try {
      // Get all AA dates
      const datesResult = await this.getAllAADates(requestUserId);
      if (!datesResult.success || !datesResult.data) {
        return {
          success: true,
          data: {},
          message: 'No AA data available'
        };
      }

      // Get recent dates (default to last 5 for AA)
      const recentDates = limit ? datesResult.data.slice(-limit) : datesResult.data.slice(-5);
      const membersParticipation: { [memberName: string]: { [date: string]: boolean } } = {};

      // Initialize participation data for requested members
      memberNames.forEach(memberName => {
        membersParticipation[memberName] = {};
      });

      // Check participation status for each date
      for (const date of recentDates) {
        const aaDataResult = await this.getAADataByDate(requestUserId, date);
        if (aaDataResult.success && aaDataResult.data) {
          const participants = aaDataResult.data.participants || [];
          const participantNames = new Set(participants.map(p => p.name));
          
          // Check each requested member
          memberNames.forEach(memberName => {
            membersParticipation[memberName]![date] = participantNames.has(memberName);
          });
        } else {
          // No data for this date, mark all as not participated
          memberNames.forEach(memberName => {
            membersParticipation[memberName]![date] = false;
          });
        }
      }

      return {
        success: true,
        data: membersParticipation,
        message: `Successfully retrieved AA participation for ${memberNames.length} members`
      };
    } catch (error) {
      console.error('Failed to get members AA participation:', error);
      return {
        success: false,
        error: 'Failed to get members AA participation',
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

export default new AAService();