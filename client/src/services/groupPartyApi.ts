import { ApiResponse } from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper function: get authenticated request headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Type definitions
export interface Group {
  id: string;
  name: string;
  type: 'kvm' | 'gvg'; // Group type
  description?: string;
  partyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  name: string;
  type: 'kvm' | 'gvg'; // Party type: KVM or AA&GVG
  groupId: string;
  leaderId?: number;
  memberIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupWithParties extends Group {
  parties: PartyWithMembers[];
  totalMembers: number;
}

export interface PartyWithMembers extends Party {
  leader?: any;
  members: any[];
}

export interface CreateGroupRequest {
  name: string;
  type: 'kvm' | 'gvg'; // Group type
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  type?: 'kvm' | 'gvg'; // Group type
  description?: string;
}

export interface CreatePartyRequest {
  name: string;
  type: 'kvm' | 'gvg'; // Party type: KVM or AA&GVG
  groupId: string;
  leaderId?: number;
  memberIds?: number[];
}

export interface UpdatePartyRequest {
  name?: string;
  type?: 'kvm' | 'gvg'; // Party type: KVM or AA&GVG
  leaderId?: number;
  memberIds?: number[];
}

export interface AssignMemberToPartyRequest {
  memberId: number;
  partyId: string;
  partyType?: string; // Party type, for multi-type party support
  isLeader?: boolean;
  slotIndex?: number; // Specify the position to assign to (0-4)
}

export interface RemoveMemberFromPartyRequest {
  memberId: number;
  partyId: string;
  partyType?: string; // Party type, for multi-type party support
}

export interface SwapMembersRequest {
  member1Id: number;
  member1PartyId: string;
  member1SlotIndex: number;
  member2Id: number;
  member2PartyId: string;
  member2SlotIndex: number;
  partyType?: string; // Party type, for multi-type party support
}

// Group API
export const groupPartyApi = {
  // Group related API
  groups: {
    // Get all groups
    getAll: async (): Promise<ApiResponse<GroupWithParties[]>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get group details
    getById: async (id: string): Promise<ApiResponse<GroupWithParties>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Create group
    create: async (data: CreateGroupRequest): Promise<ApiResponse<Group>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Update group
    update: async (id: string, data: UpdateGroupRequest): Promise<ApiResponse<Group>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Delete group
    delete: async (id: string): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  },

  // Party related API
  parties: {
    // Get all parties
    getAll: async (partyType?: string): Promise<ApiResponse<PartyWithMembers[]>> => {
      const url = partyType 
        ? `${API_BASE_URL}/group-party/parties?partyType=${encodeURIComponent(partyType)}`
        : `${API_BASE_URL}/group-party/parties`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get parties by group ID
    getByGroupId: async (groupId: string): Promise<ApiResponse<PartyWithMembers[]>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/groups/${groupId}/parties`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Get party details
    getById: async (id: string): Promise<ApiResponse<PartyWithMembers>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/parties/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Create party
    create: async (data: CreatePartyRequest): Promise<ApiResponse<Party>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/parties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Update party
    update: async (id: string, data: UpdatePartyRequest): Promise<ApiResponse<Party>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/parties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Delete party
    delete: async (id: string): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/parties/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  },

  // Member assignment related API
  members: {
    // Get unassigned members
    getUnassigned: async (partyType?: string): Promise<ApiResponse<any[]>> => {
      const url = partyType 
        ? `${API_BASE_URL}/group-party/unassigned-members?partyType=${encodeURIComponent(partyType)}`
        : `${API_BASE_URL}/group-party/unassigned-members`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },

    // Assign member to party
    assignToParty: async (data: AssignMemberToPartyRequest): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/assign-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Remove member from party
    removeFromParty: async (data: RemoveMemberFromPartyRequest): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/remove-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Swap two members' positions
    swapMembers: async (data: SwapMembersRequest): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/swap-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    clearAllParties: async (): Promise<ApiResponse<void>> => {
      const response = await fetch(`${API_BASE_URL}/group-party/clear-all-parties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      return response.json();
    }
  },
};

export default groupPartyApi;