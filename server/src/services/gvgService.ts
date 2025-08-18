import Redis from 'ioredis';
import { GVGInfo, GVGMemberData, ApiResponse } from '../types';

class GVGService {
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
      console.log('Redis connected successfully');
    });
  }

  /**
   * Import GVG data to Redis
   */
  async importGVGData(userId: string, gvgData: GVGInfo[]): Promise<ApiResponse<{ imported: number; total: number }>> {
    try {
      console.log('Starting GVG data import:', gvgData);
      let importedCount = 0;
      const totalCount = gvgData.length;

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

      for (const gvgInfo of gvgData) {
        console.log('Processing GVG data:', gvgInfo);
        
        // Validate data format
        if (!this.validateGVGInfo(gvgInfo)) {
          console.warn(`Skipping invalid GVG data:`, gvgInfo);
          continue;
        }

        // Use user ID and date as key to store GVG data
        const key = `rox_guild:user:${userId}:gvg:${gvgInfo.date}`;
        
        // Store GVG data to Redis
        await this.redis.setex(key, 86400 * 365, JSON.stringify(gvgInfo)); // Save for 1 year
        
        // Add to user's date index
        await this.redis.zadd(`rox_guild:user:${userId}:gvg:dates`, new Date(gvgInfo.date).getTime(), gvgInfo.date);
        
        importedCount++;
        console.log(`Successfully imported GVG data: ${gvgInfo.date}`);
      }

      console.log(`Import completed: ${importedCount}/${totalCount}`);
      return {
        success: true,
        data: {
          imported: importedCount,
          total: totalCount
        },
        message: `Successfully imported ${importedCount}/${totalCount} GVG records`
      };
    } catch (error) {
      console.error('Failed to import GVG data:', error);
      return {
        success: false,
        error: 'Failed to import GVG data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get GVG data for specified date
   */
  async getGVGDataByDate(userId: string, date: string): Promise<ApiResponse<GVGInfo>> {
    try {
      const key = `rox_guild:user:${userId}:gvg:${date}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return {
          success: false,
          error: 'GVG data not found for specified date',
          message: `GVG data not found for ${date}`
        };
      }

      const gvgInfo: GVGInfo = JSON.parse(data);
      return {
        success: true,
        data: gvgInfo
      };
    } catch (error) {
      console.error('Failed to get GVG data:', error);
      return {
        success: false,
        error: 'Failed to get GVG data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get GVG data within date range
   */
  async getGVGDataByDateRange(userId: string, startDate: string, endDate: string): Promise<ApiResponse<GVGInfo[]>> {
    try {
      // Fix date order - ensure startDate is earlier than endDate
      const start = new Date(startDate);
      const end = new Date(endDate);
      const minTimestamp = Math.min(start.getTime(), end.getTime());
      const maxTimestamp = Math.max(start.getTime(), end.getTime());
      
      // Get all dates within date range (corrected range)
      const dates = await this.redis.zrangebyscore(`rox_guild:user:${userId}:gvg:dates`, minTimestamp, maxTimestamp);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No GVG data in specified date range'
        };
      }

      const gvgDataList: GVGInfo[] = [];
      
      for (const date of dates) {
        const key = `rox_guild:user:${userId}:gvg:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          gvgDataList.push(JSON.parse(data));
        }
      }

      return {
        success: true,
        data: gvgDataList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by newest first
      };
    } catch (error) {
      console.error('Failed to get GVG data range:', error);
      return {
        success: false,
        error: 'Failed to get GVG data range',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get date list of all GVG data
   */
  async getAllGVGDates(userId: string): Promise<ApiResponse<string[]>> {
    try {
      const dates = await this.redis.zrange(`rox_guild:user:${userId}:gvg:dates`, 0, -1);
      return {
        success: true,
        data: dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      };
    } catch (error) {
      console.error('Failed to get GVG date list:', error);
      return {
        success: false,
        error: 'Failed to get GVG date list',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete GVG data for specified date
   */
  async deleteGVGData(userId: string, date: string): Promise<ApiResponse<boolean>> {
    try {
      const key = `rox_guild:user:${userId}:gvg:${date}`;
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        // Remove from date index
        await this.redis.zrem(`rox_guild:user:${userId}:gvg:dates`, date);
        return {
          success: true,
          data: true,
          message: `Successfully deleted GVG data for ${date}`
        };
      } else {
        return {
          success: false,
          error: 'GVG data not found for specified date',
          message: `GVG data not found for ${date}`
        };
      }
    } catch (error) {
      console.error('Failed to delete GVG data:', error);
      return {
        success: false,
        error: 'Failed to delete GVG data',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get GVG data statistics
   */
  async getGVGStatistics(userId: string): Promise<ApiResponse<{
    totalRecords: number;
    dateRange: { start: string; end: string } | null;
    totalParticipants: number;
    totalNonParticipants: number;
  }>> {
    try {
      const dates = await this.redis.zrange(`rox_guild:user:${userId}:gvg:dates`, 0, -1);
      
      if (dates.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            dateRange: null,
            totalParticipants: 0,
            totalNonParticipants: 0
          }
        };
      }

      let totalParticipants = 0;
      let totalNonParticipants = 0;
      const sortedDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // Calculate total participants and non-participants
      for (const date of dates) {
        const key = `rox_guild:user:${userId}:gvg:${date}`;
        const data = await this.redis.get(key);
        if (data) {
          const gvgInfo: GVGInfo = JSON.parse(data);
          // GVG only records non-participants, not participants
          totalNonParticipants += gvgInfo.non_participants?.length || 0;
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
          totalNonParticipants
        }
      };
    } catch (error) {
      console.error('Failed to get GVG statistics:', error);
      return {
        success: false,
        error: 'Failed to get GVG statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate GVGInfo data format
   */
  private validateGVGInfo(gvgInfo: any): gvgInfo is GVGInfo {
    if (!gvgInfo || typeof gvgInfo.date !== 'string' || typeof gvgInfo.event_type !== 'string') {
      return false;
    }
    
    // Validate non_participants is array
    if (!Array.isArray(gvgInfo.non_participants)) {
      return false;
    }
    
    // Validate each member has name field
    return gvgInfo.non_participants.every((member: any) => typeof member.name === 'string');
  }

  /**
   * Get member's GVG participation (recent 3 times)
   */
  async getMemberGVGParticipation(userId: string, memberName: string): Promise<ApiResponse<{ [date: string]: boolean }>> {
    try {
      // Get all GVG dates
      const datesResponse = await this.getAllGVGDates(userId);
      if (!datesResponse.success || !datesResponse.data) {
        return {
          success: true,
          data: {},
          message: 'No GVG data available'
        };
      }

      // Sort by date descending, take recent 3
      const recentDates = datesResponse.data
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 3);

      const participation: { [date: string]: boolean } = {};

      // Check participation status for each date
      for (const date of recentDates) {
        const gvgDataResponse = await this.getGVGDataByDate(userId, date);
        if (gvgDataResponse.success && gvgDataResponse.data) {
          const gvgData = gvgDataResponse.data;
          
          // Check if in non-participants list
          const isNonParticipant = gvgData.non_participants?.some((p: any) => p.name === memberName) || false;
          
          // GVG only records non-participants, if in non_participants list then not participated, otherwise participated
          if (isNonParticipant) {
            participation[date] = false;
          } else {
            // Not in non-participants list, means participated
            participation[date] = true;
          }
        }
      }

      return {
        success: true,
        data: participation,
        message: `Successfully retrieved GVG participation for member ${memberName}`
      };
    } catch (error) {
      console.error('Failed to get member GVG participation:', error);
      return {
        success: false,
        error: 'Failed to get member GVG participation',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all members' GVG participation status in one request
   */
  async getAllMembersGVGParticipation(userId: string): Promise<ApiResponse<{ [memberName: string]: { [date: string]: boolean } }>> {
    try {
      // Import guild service to get complete member list
      const guildService = require('./guildService').default;
      
      // Get all guild members
      const allGuildMembers = await guildService.getAllMembers(userId);
      console.log('🔍 GVG getAllMembers response:', { memberCount: allGuildMembers.length });
      
      // Get all GVG dates
      const datesResponse = await this.getAllGVGDates(userId);
      console.log('🔍 GVG getAllGVGDates response:', datesResponse);
      
      if (!datesResponse.success || !datesResponse.data) {
        return {
          success: true,
          data: {},
          message: 'No GVG data available'
        };
      }

      // Get recent dates (last 2 for GVG)
      const recentDates = datesResponse.data
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 2);
      
      console.log('🔍 GVG recent dates:', recentDates);

      const allParticipation: { [memberName: string]: { [date: string]: boolean } } = {};

      // Initialize participation data for all guild members
      allGuildMembers.forEach((member: any) => {
        allParticipation[member.name] = {};
      });

      // Collect participation data for each date
      for (const date of recentDates) {
        const gvgDataResponse = await this.getGVGDataByDate(userId, date);
        if (gvgDataResponse.success && gvgDataResponse.data) {
          const gvgData = gvgDataResponse.data;
          const nonParticipantNames = new Set((gvgData.non_participants || []).map((p: any) => p.name));
          
          // Set participation status for each member for this date
          allGuildMembers.forEach((member: any) => {
            if (nonParticipantNames.has(member.name)) {
              allParticipation[member.name]![date] = false;
            } else {
              // Not in non-participants list, means participated
              allParticipation[member.name]![date] = true;
            }
          });
        } else {
          // No GVG data for this date, assume all members participated
          allGuildMembers.forEach((member: any) => {
            allParticipation[member.name]![date] = true;
          });
        }
      }

      console.log('🔍 GVG getAllMembersGVGParticipation result:', {
        memberCount: allGuildMembers.length,
        recentDatesCount: recentDates.length,
        recentDates: recentDates,
        sampleData: Object.keys(allParticipation).slice(0, 3)
      });

      return {
        success: true,
        data: allParticipation,
        message: `Successfully retrieved GVG participation for ${allGuildMembers.length} members`
      };
    } catch (error) {
      console.error('Failed to get all members GVG participation:', error);
      return {
        success: false,
        error: 'Failed to get all members GVG participation',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get specific members' GVG participation status
   */
  async getMembersGVGParticipation(userId: string, memberNames: string[]): Promise<ApiResponse<{ [memberName: string]: { [date: string]: boolean } }>> {
    try {
      // Get all GVG dates
      const datesResponse = await this.getAllGVGDates(userId);
      if (!datesResponse.success || !datesResponse.data) {
        return {
          success: true,
          data: {},
          message: 'No GVG data available'
        };
      }

      // Get recent dates (last 2 for GVG)
      const recentDates = datesResponse.data
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 2);

      const membersParticipation: { [memberName: string]: { [date: string]: boolean } } = {};

      // Initialize participation data for requested members
      memberNames.forEach(memberName => {
        membersParticipation[memberName] = {};
      });

      // Check participation status for each date
      for (const date of recentDates) {
        const gvgDataResponse = await this.getGVGDataByDate(userId, date);
        if (gvgDataResponse.success && gvgDataResponse.data) {
          const gvgData = gvgDataResponse.data;
          const nonParticipantNames = new Set((gvgData.non_participants || []).map((p: any) => p.name));
          
          // Check each requested member
          memberNames.forEach(memberName => {
            if (nonParticipantNames.has(memberName)) {
              membersParticipation[memberName]![date] = false;
            } else {
              // Not in non-participants list, assume participated
              membersParticipation[memberName]![date] = true;
            }
          });
        } else {
          // No data for this date, assume all participated
          memberNames.forEach(memberName => {
            membersParticipation[memberName]![date] = true;
          });
        }
      }

      return {
        success: true,
        data: membersParticipation,
        message: `Successfully retrieved GVG participation for ${memberNames.length} members`
      };
    } catch (error) {
      console.error('Failed to get members GVG participation:', error);
      return {
        success: false,
        error: 'Failed to get members GVG participation',
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

export default new GVGService();