import { GuildMember, GuildInfo, CreateMemberRequest, UpdateMemberRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './databaseService';
import aaService from './aaService';
import gvgService from './gvgService';
import kvmService from './kvmService';

// Memory storage (should use database in actual projects)
class GuildService {
  private members: GuildMember[] = [];
  private guildInfo: GuildInfo = {
    id: '1',
    name: 'ROXGuild',
    level: 10,
    memberCount: 0,
    maxMembers: 100,
    description: 'ROXGuild',
  };

  constructor() {
    this.initializeMockData();
  }

  // Initialize mock data
  private initializeMockData(): void {
    const mockMembers: GuildMember[] = [
      
    ];

    this.members = mockMembers;
    this.guildInfo.memberCount = mockMembers.length;
  }

  // Get all guild members (user level)
  async getAllMembers(userId?: string): Promise<GuildMember[]> {
    try {
      if (!userId) {
        console.warn('No user ID provided, returning empty data');
        return [];
      }

      // Check database connection status
      if (!databaseService.isDatabaseConnected()) {
        console.warn('Database not connected, attempting to reconnect...');
        const connected = await databaseService.initialize();
        if (!connected) {
          console.error('Database connection failed');
          return [];
        }
      }

      // Get user's guild member data from database
      const dbMembers = await databaseService.getGuildMembers(userId);
      
      if (dbMembers && dbMembers.length > 0) {
        // console.log(`Retrieved ${dbMembers.length} guild members for user ${userId} from database`);
        return [...dbMembers];
      }
      
      // If no data in database, return empty array
      // console.log(`User ${userId} has no guild member data`);
      return [];
    } catch (error) {
      console.error('Failed to get guild member data:', error);
      return [];
    }
  }

  // Get guild member by ID (user level)
  async getMemberById(id: number, userId?: string): Promise<GuildMember | null> {
    if (!userId) {
      console.warn('No user ID provided');
      return null;
    }

    // Ensure using latest database data
    const allMembers = await this.getAllMembers(userId);
    return allMembers.find(member => {
      if (!member.id) return false;
      return member.id === id;
    }) || null;
  }

  // Create new guild member
  async createMember(memberData: CreateMemberRequest, userId: string): Promise<GuildMember> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }

    // Get user's existing guild member data
    const existingMembers = await this.getAllMembers(userId);
    
    // If client didn't provide id, calculate automatically
    let memberID = memberData.id;
    if (!memberID) {
      const maxIndex = existingMembers.length > 0 
        ? Math.max(...existingMembers.map(m => m.id))
        : 0;
      memberData.id = maxIndex + 1;
    }
    
    const newMember: GuildMember = {
      ...memberData,
      createdAt: memberData.createdAt || new Date().toISOString(), // If no creation time provided, use current time
    };

    // Add to user's member list
    const updatedMembers = [...existingMembers, newMember];

    // Save to database simultaneously
    try {
      if (databaseService.isDatabaseConnected()) {
        await databaseService.saveGuildMembers(userId, updatedMembers);
        console.log(`✅ New member ${newMember.name} saved to user ${userId} database`);
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      throw new Error('Failed to save guild member to database');
    }

    return newMember;
  }

  // Update guild member information
  async updateMember(id: number, memberData: Partial<CreateMemberRequest>, userId: string): Promise<GuildMember> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }

    // Get all user's member data
    const allMembers = await this.getAllMembers(userId);
    const memberIndex = allMembers.findIndex(member => {
      if (!member.id) return false;
      return member.id === id;
    });
    
    if (memberIndex === -1) {
      throw new Error(`Guild member does not exist, ID: ${id}`);
    }

    const currentMember = allMembers[memberIndex];
    if (!currentMember) {
      throw new Error(`Guild member does not exist, ID: ${id}`);
    }
    const oldName = currentMember.name;
    const updatedMember = {
      ...currentMember,
      ...memberData,
    } as GuildMember;
    
    // Handle undefined values, delete these properties
    Object.keys(memberData).forEach(key => {
      if (memberData[key as keyof CreateMemberRequest] === undefined) {
        delete updatedMember[key as keyof GuildMember];
      }
    });
    
    // Update member in array
    allMembers[memberIndex] = updatedMember;

    // If name changed, synchronously update member name in AA, GVG, KVM data
    if (memberData.name && memberData.name !== oldName) {
      const newName = memberData.name;
      console.log(`🔄 Member name change detected: ${oldName} -> ${newName}, starting sync update...`);
      
      try {
        // Synchronously update member name in AA data
        await this.updateMemberNameInActivityData(userId, oldName, newName, 'aa');
        
        // Synchronously update member name in GVG data
        await this.updateMemberNameInActivityData(userId, oldName, newName, 'gvg');
        
        // Synchronously update member name in KVM data
        await this.updateMemberNameInActivityData(userId, oldName, newName, 'kvm');
        
        console.log(`✅ Member name sync update completed: ${oldName} -> ${newName}`);
      } catch (error) {
        console.error(`❌ Failed to sync update member name: ${oldName} -> ${newName}`, error);
        // Don't throw error to avoid affecting member info update
      }
    }

    // Save to database simultaneously
    try {
      if (databaseService.isDatabaseConnected()) {
        await databaseService.saveGuildMembers(userId, allMembers);
        console.log(`✅ Member ${updatedMember.name} update saved to database`);
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      // Even if database save fails, don't affect in-memory update
    }

    return updatedMember;
  }

  // Synchronously update member name in activity data
  private async updateMemberNameInActivityData(userId: string, oldName: string, newName: string, activityType: 'aa' | 'gvg' | 'kvm'): Promise<void> {
    try {
      let service;
      let getAllDatesMethod;
      let getByDateMethod;
      let importDataMethod;
      
      // Select corresponding service based on activity type
      switch (activityType) {
        case 'aa':
          service = aaService;
          getAllDatesMethod = 'getAllAADates';
          getByDateMethod = 'getAADataByDate';
          importDataMethod = 'importAAData';
          break;
        case 'gvg':
          service = gvgService;
          getAllDatesMethod = 'getAllGVGDates';
          getByDateMethod = 'getGVGDataByDate';
          importDataMethod = 'importGVGData';
          break;
        case 'kvm':
          service = kvmService;
          getAllDatesMethod = 'getAllKVMDates';
          getByDateMethod = 'getKVMDataByDate';
          importDataMethod = 'importKVMData';
          break;
        default:
          throw new Error(`Unsupported activity type: ${activityType}`);
      }
      
      // Get all dates
      const datesResponse = await (service as any)[getAllDatesMethod](userId);
      if (!datesResponse.success || !datesResponse.data || datesResponse.data.length === 0) {
        console.log(`${activityType.toUpperCase()} data is empty, skipping name update`);
        return;
      }
      
      let hasUpdates = false;
      const updatedData = [];
      
      // Iterate through data for each date
      for (const date of datesResponse.data) {
        const dataResponse = await (service as any)[getByDateMethod](userId, date);
        if (!dataResponse.success || !dataResponse.data) {
          continue;
        }
        
        const activityData = dataResponse.data;
        let dataUpdated = false;
        
        if (activityType === 'aa') {
          // AA data structure: { date, participants: [{ name }], total_participants }
          if (activityData.participants && Array.isArray(activityData.participants)) {
            activityData.participants.forEach((participant: any) => {
              if (participant.name === oldName) {
                participant.name = newName;
                dataUpdated = true;
                hasUpdates = true;
              }
            });
          }
        } else if (activityType === 'gvg') {
          // GVG data structure: { date, event_type, non_participants: [{ name }] }
          if (activityData.non_participants && Array.isArray(activityData.non_participants)) {
            activityData.non_participants.forEach((participant: any) => {
              if (participant.name === oldName) {
                participant.name = newName;
                dataUpdated = true;
                hasUpdates = true;
              }
            });
          }
        } else if (activityType === 'kvm') {
          // KVM data structure: { date, participants: [{ name }] }
          if (activityData.participants && Array.isArray(activityData.participants)) {
            activityData.participants.forEach((participant: any) => {
              if (participant.name === oldName) {
                participant.name = newName;
                dataUpdated = true;
                hasUpdates = true;
              }
            });
          }
        }
        
        if (dataUpdated) {
          updatedData.push(activityData);
        }
      }
      
      // If there are updates, re-import data
      if (hasUpdates && updatedData.length > 0) {
        const importResponse = await (service as any)[importDataMethod](userId, updatedData);
        if (importResponse.success) {
          console.log(`✅ Member name update successful in ${activityType.toUpperCase()} data: ${oldName} -> ${newName}`);
        } else {
          console.error(`❌ Member name update failed in ${activityType.toUpperCase()} data:`, importResponse.error);
        }
      } else {
        console.log(`Member ${oldName} not found in ${activityType.toUpperCase()} data, no update needed`);
      }
    } catch (error) {
      console.error(`Error occurred while updating member name in ${activityType.toUpperCase()} data:`, error);
      throw error;
    }
  }

  // Delete guild member
  async deleteMember(id: number, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }

    // Get all member data for user
    const allMembers = await this.getAllMembers(userId);
    const memberIndex = allMembers.findIndex(member => {
      if (!member.id) return false;
      return member.id === id;
    });
    
    if (memberIndex === -1) {
      throw new Error(`Guild member does not exist, ID: ${id}`);
    }

    const deletedMember = allMembers[memberIndex]!;
    allMembers.splice(memberIndex, 1);

    // Save to database simultaneously
    try {
      if (databaseService.isDatabaseConnected()) {
        await databaseService.saveGuildMembers(userId, allMembers);
        console.log(`✅ Member ${deletedMember.name} deletion saved to user ${userId} database`);
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      throw new Error('Failed to delete guild member');
    }
  }

  // Delete all guild members
  async deleteAllMembers(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }

    // Save to database simultaneously
    try {
      if (databaseService.isDatabaseConnected()) {
        await databaseService.saveGuildMembers(userId, []);
        console.log(`✅ All guild members for user ${userId} deleted from database`);
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
      throw new Error('Failed to delete all guild members');
    }
  }

  // Batch update guild members (for screenshot recognition)
  async batchUpdateMembers(members: GuildMember[], userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }

    const processedMembers = members.map((member, index) => ({
      ...member,
      id: member.id || (index + 1),
    }));

    // Save to database
    try {
      if (databaseService.isDatabaseConnected()) {
        await databaseService.saveGuildMembers(userId, processedMembers);
        console.log(`✅ Batch update of ${processedMembers.length} guild members saved to user ${userId} database`);
      }
    } catch (error) {
      console.error('Failed to batch save to database:', error);
      throw new Error('Failed to batch update guild members');
    }
  }

  // Get guild information
  async getGuildInfo(): Promise<GuildInfo> {
    return { ...this.guildInfo };
  }

  // Update guild information
  async updateGuildInfo(info?: Partial<GuildInfo>): Promise<GuildInfo> {
    if (info) {
      this.guildInfo = {
        ...this.guildInfo,
        ...info,
      };
    } else {
      // Update guild statistics
      this.guildInfo.memberCount = this.members.length;
    }
    return { ...this.guildInfo };
  }

  // Search guild members
  async searchMembers(query: string, userId: string): Promise<GuildMember[]> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }
    
    const allMembers = await this.getAllMembers(userId);
    const lowercaseQuery = query.toLowerCase();
    return allMembers.filter(member =>
      member.name.toLowerCase().includes(lowercaseQuery) ||
      (member.class && member.class.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Filter members by class
  async getMembersByClass(className: string, userId: string): Promise<GuildMember[]> {
    if (!userId) {
      throw new Error('User authentication information missing');
    }
    
    const allMembers = await this.getAllMembers(userId);
    return allMembers.filter(member => member.class === className);
  }

}

export default new GuildService();