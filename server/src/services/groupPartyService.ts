import { 
  Group, 
  Party, 
  GroupWithParties, 
  PartyWithMembers, 
  CreateGroupRequest, 
  UpdateGroupRequest, 
  CreatePartyRequest, 
  UpdatePartyRequest,
  AssignMemberToPartyRequest,
  RemoveMemberFromPartyRequest,
  SwapMembersRequest,
  GuildMember,
  CreateMemberRequest 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './databaseService';
import guildService from './guildService';

class GroupPartyService {
  private groups: Group[] = [];
  private parties: Party[] = [];

  constructor() {
    this.initializeDefaultData().catch(error => {
      console.error('Failed to initialize default data:', error);
    });
  }

  public async initializeDefaultData() {
    console.log('✅ Party data initialization updated to user level, global initialization skipped');
  }

  /**
   * Initialize default data for specific user
   */
  public async initializeUserData(userId: string) {
    console.log(`🔄 Starting default party data initialization for user ${userId}...`);
    try {
      // Check if party data and group data already exist
      const existingParties = await databaseService.getParties(userId);
      const existingGroups = await databaseService.getGroups(userId);
      console.log(`📊 Checking existing data for user ${userId}: ${existingParties ? existingParties.length : 0} parties, ${existingGroups ? existingGroups.length : 0} groups`);
      
      if ((existingParties && existingParties.length > 0) || (existingGroups && existingGroups.length > 0)) {
        console.log(`Data already exists for user ${userId}, skipping initialization`);
        return;
      }
      
      // Create two default groups: KVM group and GVG group
      const kvmGroup: Group = {
        id: uuidv4(),
        name: 'KVM Group',
        type: 'kvm',
        description: 'KVM Activity Organization',
        partyIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const gvgGroup: Group = {
        id: uuidv4(),
        name: 'GVG Group',
        type: 'gvg',
        description: 'GVG Activity Organization',
        partyIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create 40 default parties, first 20 for KVM, last 20 for AA&GVG
      const defaultParties: Party[] = [];
      
      for (let partyIndex = 1; partyIndex <= 40; partyIndex++) {
        const partyType = partyIndex <= 20 ? 'kvm' : 'gvg';
        const partyName = partyIndex <= 20 ? `KVM Party ${partyIndex}` : `GVG Party ${partyIndex - 20}`;
        const groupId = partyIndex <= 20 ? kvmGroup.id : gvgGroup.id;
        
        defaultParties.push({
          id: uuidv4(),
          name: partyName,
          type: partyType,
          groupId: groupId,
          memberIds: [0, 0, 0, 0, 0], // Fixed 5 positions, 0 means empty slot
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Save data to database
      await databaseService.saveGroups(userId, [kvmGroup, gvgGroup]);
      await databaseService.saveParties(userId, defaultParties);
      
      console.log(`✅ Default party data initialization completed for user ${userId}: created 40 parties (20 KVM, 20 GVG)`);
    } catch (error) {
      console.error('Failed to initialize default party data:', error);
    }
  }

  // ==================== Group Management ====================

  /**
   * Get all groups (requires user ID)
   */
  async getAllGroups(userId?: string): Promise<Group[]> {
    try {
      if (!userId) {
        // If no user ID, return data from memory
        return [...this.groups];
      }
      
      // Load latest data from database
      const savedGroups = await databaseService.getGroups(userId);
      if (savedGroups && savedGroups.length > 0) {
        this.groups = savedGroups;
      }
      return [...this.groups];
    } catch (error) {
      console.error('Failed to get group list:', error);
      return [...this.groups];
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(id: string): Promise<Group | null> {
    const groups = await this.getAllGroups();
    return groups.find(group => group.id === id) || null;
  }

  /**
   * Get group details (including parties and members)
   */
  async getGroupWithParties(id: string): Promise<GroupWithParties | null> {
    const group = await this.getGroupById(id);
    if (!group) return null;

    const parties = await this.getPartiesByGroupId(id);
    const partiesWithMembers = await Promise.all(
      parties.map(party => this.getPartyWithMembers(party.id))
    );

    const validParties = partiesWithMembers.filter(p => p !== null) as PartyWithMembers[];
    const totalMembers = validParties.reduce((sum, party) => sum + party.members.length, 0);

    return {
      ...group,
      parties: validParties,
      totalMembers
    };
  }

  /**
   * Create new group
   */
  async createGroup(groupData: CreateGroupRequest): Promise<Group> {
    const newGroup: Group = {
      id: uuidv4(),
      name: groupData.name,
      type: groupData.type,
      ...(groupData.description && { description: groupData.description }),
      partyIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.groups.push(newGroup);
    await this.saveGroupsToDatabase();
    return newGroup;
  }

  /**
   * Update group
   */
  async updateGroup(updateData: UpdateGroupRequest): Promise<Group | null> {
    const groupIndex = this.groups.findIndex(g => g.id === updateData.id);
    if (groupIndex === -1) return null;

    const existingGroup = this.groups[groupIndex]!;
    const updatedGroup: Group = {
      id: existingGroup.id,
      name: updateData.name || existingGroup.name,
      type: updateData.type || existingGroup.type,
      partyIds: existingGroup.partyIds,
      createdAt: existingGroup.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    if (updateData.description !== undefined) {
      updatedGroup.description = updateData.description;
    } else if (existingGroup.description !== undefined) {
      updatedGroup.description = existingGroup.description;
    }

    this.groups[groupIndex] = updatedGroup;
    await this.saveGroupsToDatabase();
    return updatedGroup;
  }

  /**
   * Delete group
   */
  async deleteGroup(id: string, userId: string): Promise<boolean> {
    // First delete all parties under this group
    const parties = await this.getPartiesByGroupId(id);
    for (const party of parties) {
      await this.deleteParty(party.id, userId);
    }

    // Delete the group
    const initialLength = this.groups.length;
    this.groups = this.groups.filter(g => g.id !== id);
    
    if (this.groups.length < initialLength) {
      await this.saveGroupsToDatabase();
      return true;
    }
    return false;
  }

  // ==================== Party Management ====================

  /**
   * Get all parties (requires user ID)
   */
  async getAllParties(userId?: string, partyType?: string): Promise<PartyWithMembers[]> {
    try {
      if (userId) {
        console.log(`🔄 Getting party data for user ${userId}, type filter: ${partyType || 'none'}`);

        const savedParties = await databaseService.getParties(userId);

        console.log(`📊 Retrieved ${savedParties ? savedParties.length : 0} parties from database`);
        
        if (savedParties && savedParties.length > 0) {
          this.parties = savedParties;
          console.log(`✅ Successfully loaded user party data: ${this.parties.length} parties`);
        } else {
          console.log(`⚠️ User ${userId} has no party data, starting initialization...`);
          // If user has no party data, initialize first
          await this.initializeUserData(userId);
          // Retrieve data again
          const newSavedParties = await databaseService.getParties(userId);
          if (newSavedParties && newSavedParties.length > 0) {
            this.parties = newSavedParties;
            console.log(`✅ Initialization completed, loaded ${this.parties.length} parties`);
          }
        }
      }
      
      // Filter parties by partyType
      let filteredParties = this.parties;
      if (partyType) {
        filteredParties = this.parties.filter(party => party.type === partyType);
        console.log(`🔍 After filtering by type ${partyType}, ${filteredParties.length} parties remain`);
      }
      
      console.log(`🔄 Starting conversion of ${filteredParties.length} parties to PartyWithMembers format...`);
      
      // Convert to PartyWithMembers format
      const partiesWithMembers: PartyWithMembers[] = [];
      for (const party of filteredParties) {
        const partyWithMembers = await this.getPartyWithMembers(party.id, userId);
        if (partyWithMembers) {
          partiesWithMembers.push(partyWithMembers);
        }
      }
      
      console.log(`✅ Successfully converted ${partiesWithMembers.length} parties`);
      console.log(`📋 Party type distribution:`, partiesWithMembers.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      return partiesWithMembers;
    } catch (error) {
      console.error('Failed to get party list:', error);
      return [];
    }
  }

  /**
   * Get parties by group ID
   */
  async getPartiesByGroupId(groupId: string, userId?: string): Promise<PartyWithMembers[]> {
    const parties = await this.getAllParties(userId);
    return parties.filter(party => party.groupId === groupId);
  }

  /**
   * Get party by ID (requires user ID)
   */
  async getPartyById(id: string, userId?: string): Promise<Party | null> {
    try {
      if (userId) {
        const savedParties = await databaseService.getParties(userId);
        if (savedParties && savedParties.length > 0) {
          this.parties = savedParties;
        }
      }
      return this.parties.find(party => party.id === id) || null;
    } catch (error) {
      console.error('Failed to get party:', error);
      return this.parties.find(party => party.id === id) || null;
    }
  }

  /**
   * Get party details (including members)
   */
  async getPartyWithMembers(id: string, userId?: string): Promise<PartyWithMembers | null> {
    const party = await this.getPartyById(id);
    if (!party) return null;

    const allMembers = await guildService.getAllMembers(userId);
    
    // Debug log: print party and member information
    // console.log(`🔍 MemberIds for party ${party.name} (${party.id}):`, party.memberIds);
    // console.log(`🔍 Total member count: ${allMembers.length}`);
    if (allMembers.length > 0 && allMembers[0]) {
      // console.log(`🔍 First member ID type and value:`, typeof allMembers[0].id, allMembers[0].id);
    }
    
    const partyMembers = allMembers.filter(member => {
      const memberId = member.id;
      if (!memberId) return false;
      
      // Directly use number type matching
      const isIncluded = party.memberIds.includes(memberId);
      
      if (isIncluded) {
        // console.log(`✅ Found matching member: ${member.name} (ID: ${memberId})`);
      }
      return isIncluded;
    });
    
    // console.log(`🔍 Party ${party.name} found ${partyMembers.length} members`);

    const leader = party.leaderId ? 
      allMembers.find(member => member.id === party.leaderId) : 
      undefined;

    const result: PartyWithMembers = {
      id: party.id,
      name: party.name,
      type: party.type, // Add type field
      ...(party.groupId && { groupId: party.groupId }),
      memberIds: party.memberIds, // Array containing 5 positions
      members: partyMembers,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt
    };
    
    if (leader) {
      result.leader = leader;
    }
    
    if (party.leaderId) {
      result.leaderId = party.leaderId;
    }
    
    return result;
  }

  /**
   * Create new party
   */
  async createParty(partyData: CreatePartyRequest, userId?: string): Promise<Party> {
    // If group ID is specified, check if the group exists
    if (partyData.groupId) {
      const group = await this.getGroupById(partyData.groupId);
      if (!group) {
        throw new Error('The specified group does not exist');
      }

      // Check if the number of parties under the group has reached the limit
      const existingParties = await this.getPartiesByGroupId(partyData.groupId);
      if (existingParties.length >= 5) {
        throw new Error('Each group can have at most 5 parties');
      }
    }

    const newParty: Party = {
      id: uuidv4(),
      type: partyData.type,
      name: partyData.name,
      ...(partyData.groupId && { groupId: partyData.groupId }),
      memberIds: partyData.memberIds || [0, 0, 0, 0, 0], // Fixed 5 positions, 0 means empty slot
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (partyData.leaderId) {
      newParty.leaderId = partyData.leaderId;
    }

    // Validate member count
    if (newParty.memberIds.length > 5) {
      throw new Error('Each party can have at most 5 members');
    }

    this.parties.push(newParty);
    
    // If the party belongs to a group, update the group's party list
    if (partyData.groupId) {
      const group = await this.getGroupById(partyData.groupId);
      if (group) {
        group.partyIds.push(newParty.id);
        await this.saveGroupsToDatabase();
      }
    }
    
    await this.savePartiesToDatabase(userId);
    return newParty;
  }

  /**
   * Update party
   */
  async updateParty(updateData: UpdatePartyRequest, userId?: string): Promise<Party | null> {
    const partyIndex = this.parties.findIndex(p => p.id === updateData.id);
    if (partyIndex === -1) return null;

    // Validate member count
    if (updateData.memberIds && updateData.memberIds.length > 5) {
      throw new Error('Each party can have at most 5 members');
    }

    const existingParty = this.parties[partyIndex]!;
    const updatedParty: Party = {
      id: existingParty.id,
      type: existingParty.type,
      name: existingParty.name,
      ...(existingParty.groupId && { groupId: existingParty.groupId }),
      memberIds: existingParty.memberIds,
      createdAt: existingParty.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    if (existingParty.leaderId) {
      updatedParty.leaderId = existingParty.leaderId;
    }
    
    if (updateData.name) {
      updatedParty.name = updateData.name;
    }
    if (updateData.type) {
      updatedParty.type = updateData.type;
    }
    if (updateData.leaderId !== undefined) {
      updatedParty.leaderId = updateData.leaderId;
    }
    if (updateData.memberIds) {
      updatedParty.memberIds = updateData.memberIds;
    }

    this.parties[partyIndex] = updatedParty;
    await this.savePartiesToDatabase(userId);
    return updatedParty;
  }

  /**
   * Delete party
   */
  async deleteParty(id: string, userId: string): Promise<boolean> {
    const party = await this.getPartyById(id);
    if (!party) return false;

    // Remove party ID from group (if the party belongs to a group)
    if (party.groupId) {
      const group = await this.getGroupById(party.groupId);
      if (group) {
        group.partyIds = group.partyIds.filter(pid => pid !== id);
        await this.saveGroupsToDatabase();
      }
    }

    // Clear member's party association
    const allMembers = await guildService.getAllMembers(userId);
    for (const member of allMembers) {
      if (member.partyDic) {
        const newPartyDic = { ...member.partyDic };
        let hasPartyToDelete = false;
        
        // Find and delete entries containing this party ID
        for (const [partyType, partyInfo] of Object.entries(newPartyDic)) {
          if (partyInfo.partyId === id) {
            delete newPartyDic[partyType];
            hasPartyToDelete = true;
            break;
          }
        }
        
        if (hasPartyToDelete) {
          const updateData: any = {
             partyDic: newPartyDic
           };
          
          if (!userId) {
            throw new Error('User authentication information missing');
          }
          await guildService.updateMember(member.id, updateData, userId);
        }
      }
    }

    // Delete the party
    const initialLength = this.parties.length;
    this.parties = this.parties.filter(p => p.id !== id);
    
    if (this.parties.length < initialLength) {
      await this.savePartiesToDatabase(userId);
      return true;
    }
    return false;
  }

  // ==================== Member Assignment Management ====================

  /**
   * Assign member to party
   */
  async assignMemberToParty(request: AssignMemberToPartyRequest, userId: string): Promise<boolean> {
    const party = await this.getPartyById(request.partyId);
    if (!party) {
      throw new Error('Party does not exist');
    }

    const member = await guildService.getMemberById(request.memberId, userId);
    if (!member) {
      throw new Error('Member does not exist');
    }

    // Ensure party.memberIds is a fixed-length array of 5
    if (!Array.isArray(party.memberIds) || party.memberIds.length !== 5) {
      party.memberIds = [0,0,0,0,0];
    }

    // First remove the member from parties of the same type (ensure uniqueness in parties of the same type)
    const targetParty = this.parties.find(p => p.id === request.partyId);
    if (targetParty) {
      const sameTypeParties = this.parties.filter(p => p.type === targetParty.type && p.id !== request.partyId);
      for (const existingParty of sameTypeParties) {
        const memberIndex = existingParty.memberIds.indexOf(request.memberId);
        if (memberIndex !== -1) {
          existingParty.memberIds[memberIndex] = 0;
          if (existingParty.leaderId === request.memberId) {
            delete existingParty.leaderId;
          }
        }
      }
    }

    // Determine the position to assign
    let targetSlotIndex = request.slotIndex;
    if (targetSlotIndex === undefined) {
      // If no position is specified, decide based on whether it's a leader
      if (request.isLeader) {
        targetSlotIndex = 0; // Leader is fixed at position 0
      } else {
        // Find the first empty slot (non-0 and non-leader position)
        targetSlotIndex = party.memberIds.findIndex((id, index) => index > 0 && id === 0);
        if (targetSlotIndex === -1) {
          throw new Error('Party is full, cannot add more members');
        }
      }
    }

    // Validate position validity
    if (targetSlotIndex < 0 || targetSlotIndex >= 5) {
      throw new Error('Invalid position index');
    }

    // Clear the member's old position in the target party (if it exists and is not the target position)
    for (let i = 0; i < party.memberIds.length; i++) {
      if (party.memberIds[i] === request.memberId && i !== targetSlotIndex) {
        console.log(`🔄 Clearing old position ${i} of member ${request.memberId} in target party`);
        party.memberIds[i] = 0;
        // If the removed member is the leader, clear the leader mark
        if (party.leaderId === request.memberId) {
          delete party.leaderId;
        }
      }
    }

    // Check if the target position is already occupied
    // Note: In a swap scenario, the target position should not be cleared, as there may be members that need to be swapped
    const existingMemberAtTarget = party.memberIds[targetSlotIndex];
    if (existingMemberAtTarget !== 0 && existingMemberAtTarget !== request.memberId) {
      console.log(`⚠️ Target position ${targetSlotIndex} is occupied by member ${existingMemberAtTarget}, this might be a swap operation`);
      // In a swap scenario, don't clear the target position, let the swapMembers function handle it
    }

    // If set as leader, clear the original leader first
    if (request.isLeader || targetSlotIndex === 0) {
      if (party.leaderId && party.leaderId !== request.memberId) {
        const oldLeader = await guildService.getMemberById(party.leaderId, userId);
        if (oldLeader) {
          // Original leader information is already managed in partyDic, no additional update needed
        }
        // Clear the original leader's position in the party
        const oldLeaderIndex = party.memberIds.findIndex(id => id === party.leaderId);
        if (oldLeaderIndex !== -1) {
          console.log(`🔄 Clearing original leader ${party.leaderId} at position ${oldLeaderIndex}`);
          party.memberIds[oldLeaderIndex] = 0;
        }
      }
      party.leaderId = request.memberId;
    }

    // Handle the overwritten member
    if (existingMemberAtTarget && existingMemberAtTarget !== 0 && existingMemberAtTarget !== request.memberId) {
      console.log(`🔄 Overwriting existing member ${existingMemberAtTarget} at position ${targetSlotIndex}`);
      
      // Clear the overwritten member's party association
      const displacedMember = await guildService.getMemberById(existingMemberAtTarget, userId);
      if (displacedMember) {
        // The overwritten member's party information is already managed in partyDic, no additional update needed
        console.log(`🔄 Clearing party association for overwritten member ${existingMemberAtTarget}`);
      }
      
      // If the overwritten member is the leader, clear the leader setting
      if (party.leaderId === existingMemberAtTarget) {
        delete party.leaderId;
        console.log(`🔄 Clearing leader status for overwritten leader ${existingMemberAtTarget}`);
      }
    }
    
    // Assign the member to the specified position
    console.log(`🔄 Assigning member ${request.memberId} to position ${targetSlotIndex}`);
    party.memberIds[targetSlotIndex] = request.memberId;

    // Update the member's party information
    const currentPartyDic = member.partyDic || {};
    const newPartyDic = { ...currentPartyDic };
    
    // Set new party information
    if (targetParty) {
      newPartyDic[targetParty.type] = {
        partyId: request.partyId,
        isPartyLeader: request.isLeader || false
      };
    }
    
    const updateData: any = {
      partyDic: newPartyDic
    };
    
    if (!userId) {
      throw new Error('User authentication information missing');
    }
    await guildService.updateMember(request.memberId, updateData, userId);

    // Save all affected party updates
    await this.savePartiesToDatabase(userId);
    
    console.log(`✅ Member ${member.name} assigned to party ${party.name}`);
    return true;
  }

  /**
   * Remove member from party
   */
  async removeMemberFromParty(request: RemoveMemberFromPartyRequest, userId: string): Promise<boolean> {
    const party = await this.getPartyById(request.partyId);
    if (!party) {
      throw new Error('Party does not exist');
    }

    const member = await guildService.getMemberById(request.memberId, userId);
    if (!member) {
      throw new Error('Member does not exist');
    }

    // Remove member from party, maintaining the 5-position structure
    const memberIndex = party.memberIds.findIndex(id => id === request.memberId);
    if (memberIndex !== -1) {
      console.log(`🗑️ Clearing member ${request.memberId} from position ${memberIndex} in party ${party.name}`);
      party.memberIds[memberIndex] = 0;
    }
    
    // If the removed member is the leader, clear the leader setting
    if (party.leaderId === request.memberId) {
      console.log(`🔄 Clearing leader setting: ${party.leaderId}`);
      delete party.leaderId;
    }

    // Update member information, remove this party from partyDic
    const currentPartyDic = member.partyDic || {};
    const newPartyDic = { ...currentPartyDic };
    
    // Find and remove the corresponding party type
    const partyToRemove = this.parties.find(p => p.id === request.partyId);
    if (partyToRemove && newPartyDic[partyToRemove.type]) {
      delete newPartyDic[partyToRemove.type];
    }
    
    const updateData: any = {
      partyDic: newPartyDic
    };
    
    await guildService.updateMember(request.memberId, updateData, userId);

    // Save party updates
    const partyUpdateData: UpdatePartyRequest = {
      id: party.id,
      type: party.type,
      memberIds: party.memberIds
    };
    if (party.leaderId) {
      partyUpdateData.leaderId = party.leaderId;
    }
    await this.updateParty(partyUpdateData, userId);

    return true;
  }

  /**
   * Get unassigned members
   */
  async getUnassignedMembers(partyType?: string, userId?: string): Promise<GuildMember[]> {
    try {
      const allMembers = await guildService.getAllMembers(userId);
      
      if (!partyType) {
        // If no party type is specified, return completely unassigned members
        return allMembers.filter(member => !member.partyDic || Object.keys(member.partyDic).length === 0);
      }
      
      // Filter unassigned members by party type
      return allMembers.filter(member => {
        if (!member.partyDic) {
          return true; // Completely unassigned member
        }
        
        // Check if the member is in a party of the specified type
        return !member.partyDic[partyType];
      });
    } catch (error) {
      console.error('❌ Failed to get unassigned members:', error);
      throw error;
    }
  }

  /**
   * Swap positions of two members
   */
  async swapMembers(request: SwapMembersRequest, userId: string): Promise<boolean> {
    try {
      console.log(`🔄 Swap request details:`, JSON.stringify(request, null, 2));
      const { member1Id, member2Id, member1SlotIndex, member2SlotIndex } = request;
      
      // Ensure the latest party data for the user is loaded
      console.log(`🔄 Loading latest party data for user ${userId}...`);
      const savedParties = await databaseService.getParties(userId);
      if (savedParties && savedParties.length > 0) {
        this.parties = savedParties;
        console.log(`✅ Successfully loaded user party data: ${savedParties.length} parties`);
      } else {
        console.log(`⚠️ User ${userId} has no party data`);
        throw new Error('User has no party data');
      }

      // Automatically find the actual party where members are located
      let actualMember1Party = null;
      let actualMember1SlotIndex = -1;
      let actualMember2Party = null;
      let actualMember2SlotIndex = -1;
      
      for (const party of this.parties) {

        if(party.type != request.partyType){
          continue;
        }

        const member1Index = party.memberIds.findIndex(id => id === member1Id);
        const member2Index = party.memberIds.findIndex(id => id === member2Id);
        
        if (member1Index !== -1) {
          actualMember1Party = party;
          actualMember1SlotIndex = member1Index;
        }
        if (member2Index !== -1) {
          actualMember2Party = party;
          actualMember2SlotIndex = member2Index;
        }
      }
      
      if (!actualMember1Party || !actualMember2Party) {
        throw new Error('Cannot find the party where members are located');
      }
      
      console.log(`📊 Detected actual party status:`);
      console.log(`  Member1(${member1Id}) actually in Party(${actualMember1Party.id})[${actualMember1SlotIndex}]`);
      console.log(`  Member2(${member2Id}) actually in Party(${actualMember2Party.id})[${actualMember2SlotIndex}]`);
      
      // Execute position swap
      actualMember1Party.memberIds[actualMember1SlotIndex] = member2Id;
      actualMember2Party.memberIds[actualMember2SlotIndex] = member1Id;
      
      // Simplified leader logic: set leader directly based on position after swap
      console.log(`🔄 Leader update logic:`);
      console.log(`  Member1(${member1Id}) moving from Party1[${actualMember1SlotIndex}] to Party2[${actualMember2SlotIndex}]`);
      console.log(`  Member2(${member2Id}) moving from Party2[${actualMember2SlotIndex}] to Party1[${actualMember1SlotIndex}]`);
      
      // Set leader based on final position
      if (actualMember1SlotIndex === 0) {
        // member2 moves to the leader position of party1
        console.log(`  Setting Member2(${member2Id}) as leader of Party1(${actualMember1Party.id})`);
        actualMember1Party.leaderId = member2Id;
      } else {
        // member2 is not in the leader position, clear if it was the leader before
        if (actualMember1Party.leaderId === member2Id) {
          console.log(`  Clearing Member2(${member2Id}) leader status in Party1(${actualMember1Party.id})`);
          delete actualMember1Party.leaderId;
        }
      }
      
      if (actualMember2SlotIndex === 0) {
        // member1 moves to the leader position of party2
        console.log(`  Setting Member1(${member1Id}) as leader of Party2(${actualMember2Party.id})`);
        actualMember2Party.leaderId = member1Id;
      } else {
        // member1 is not in the leader position, clear if it was the leader before
        if (actualMember2Party.leaderId === member1Id) {
          console.log(`  Clearing Member1(${member1Id}) leader status in Party2(${actualMember2Party.id})`);
          delete actualMember2Party.leaderId;
        }
      }
      
      // Update members' party information
      const allMembers = await guildService.getAllMembers(userId);
      console.log(`🔍 Finding members for update:`);
      console.log(`  Total member count: ${allMembers.length}`);
      console.log(`  Looking for Member1 ID: ${member1Id} (type: ${typeof member1Id})`);
      console.log(`  Looking for Member2 ID: ${member2Id} (type: ${typeof member2Id})`);
      
      const member1 = allMembers.find(m => m.id === member1Id);
      const member2 = allMembers.find(m => m.id === member2Id);
      
      console.log(`  Found Member1: ${member1?.name || 'not found'}`);
      console.log(`  Found Member2: ${member2?.name || 'not found'}`);
      
      if (member1) {
        // Update member1's partyDic, remove old party, add new party
        const member1PartyDic = member1.partyDic || {};
        const newMember1PartyDic = { ...member1PartyDic };
        
        // Remove association with old party type
        if (actualMember1Party.type && newMember1PartyDic[actualMember1Party.type]) {
          delete newMember1PartyDic[actualMember1Party.type];
        }
        
        // Add association with new party type
        if (actualMember2Party.type) {
          newMember1PartyDic[actualMember2Party.type] = {
            partyId: actualMember2Party.id,
            isPartyLeader: actualMember2SlotIndex === 0
          };
        }
        
        const member1UpdateData: Partial<CreateMemberRequest> = {
            partyDic: newMember1PartyDic
          };
        console.log(`🔄 Updating Member1(${member1Id}) data:`, member1UpdateData);
        if (!userId) {
          throw new Error('User authentication information missing');
        }
        await guildService.updateMember(member1Id, member1UpdateData, userId);
        console.log(`✅ Member1 update completed`);
      } else {
        console.log(`❌ Member1(${member1Id}) not found, cannot update`);
      }
      
      if (member2) {
        // Update member2's partyDic, remove old party, add new party
        const member2PartyDic = member2.partyDic || {};
        const newMember2PartyDic = { ...member2PartyDic };
        
        // Remove association with old party type
        if (actualMember2Party.type && newMember2PartyDic[actualMember2Party.type]) {
          delete newMember2PartyDic[actualMember2Party.type];
        }
        
        // Add association with new party type
        if (actualMember1Party.type) {
          newMember2PartyDic[actualMember1Party.type] = {
            partyId: actualMember1Party.id,
            isPartyLeader: actualMember1SlotIndex === 0
          };
        }
        
        const member2UpdateData: Partial<CreateMemberRequest> = {
            partyDic: newMember2PartyDic
          };
        console.log(`🔄 Updating Member2(${member2Id}) data:`, member2UpdateData);
        if (!userId) {
          throw new Error('User authentication information missing');
        }
        await guildService.updateMember(member2Id, member2UpdateData, userId);
        console.log(`✅ Member2 update completed`);
      } else {
        console.log(`❌ Member2(${member2Id}) not found, cannot update`);
      }
      
      // Save to database
      await this.savePartiesToDatabase(userId);
      
      console.log(`✅ Member swap successful: ${member1Id} (${actualMember1Party.id}[${actualMember1SlotIndex}]) <-> ${member2Id} (${actualMember2Party.id}[${actualMember2SlotIndex}])`);
      return true;
    } catch (error) {
      console.error('Failed to swap member positions:', error);
      throw error;
    }
  }

  // ==================== Batch Operations ====================

  /**
   * Clear all party members
   */
  async clearAllParties(userId: string): Promise<boolean> {
    try {
      // Get all members
      const allMembers = await guildService.getAllMembers(userId);
      
      // Clear all members' party associations
      for (const member of allMembers) {
        if (member.partyDic && Object.keys(member.partyDic).length > 0) {
          const updateData: any = {
            partyDic: {}
          };
          
          if (!userId) {
            throw new Error('User authentication information missing');
          }
          await guildService.updateMember(member.id!, updateData, userId);
        }
      }
      
      // Clear member lists and leaders for all parties
      for (const party of this.parties) {
        party.memberIds = [0, 0, 0, 0, 0];
        delete party.leaderId;
      }
      
      // Save to database
      await this.savePartiesToDatabase(userId);
      
      console.log('✅ All parties cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear parties:', error);
      return false;
    }
  }

  // ==================== Data Persistence ====================

  // Note: These methods are deprecated, database now requires user ID
  private async saveGroupsToDatabase(userId?: string): Promise<void> {
    if (!userId) {
      console.warn('User ID required to save group data, skipping save');
      return;
    }
    try {
      await databaseService.saveGroups(userId, this.groups);
    } catch (error) {
      console.error('Failed to save group data:', error);
    }
  }

  private async savePartiesToDatabase(userId?: string): Promise<void> {
    if (!userId) {
      console.warn('User ID required to save party data, skipping save');
      return;
    }
    try {
      await databaseService.saveParties(userId, this.parties);
    } catch (error) {
      console.error('Failed to save party data:', error);
    }
  }
}

export const groupPartyService = new GroupPartyService();
export default groupPartyService;