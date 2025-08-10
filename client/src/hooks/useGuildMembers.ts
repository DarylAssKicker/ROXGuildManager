import { useState, useEffect, useCallback, useRef } from 'react';
import { guildMembersApi } from '../services/api';
import { GuildMember } from '../types';

export const useGuildMembers = () => {
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitializedRef = useRef(false);

  // Get all guild members - use useCallback to avoid duplicate creation
  const fetchMembers = useCallback(async () => {
    // If loading, don't make duplicate requests
    if (loading) {
      console.log('Request in progress, skipping duplicate request');
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    try {
      console.log('Starting to fetch guild member data...');
      const response = await guildMembersApi.getAll();
      const apiResponse = response.data;
      
      // Check API response structure
      if (apiResponse.success && apiResponse.data) {
        const membersData = Array.isArray(apiResponse.data) ? apiResponse.data : [];
        setMembers(membersData);
        console.log('Successfully fetched guild member data:', membersData.length, 'members');
      } else {
        console.error('API response format error:', apiResponse);
        setMembers([]);
        setError(apiResponse.error || 'Failed to fetch data');
      }
    } catch (err) {
      // If request was cancelled, don't show error
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      setError('Failed to fetch guild members');
      console.error('Failed to fetch guild members:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Add guild member
  const addMember = async (member: Omit<GuildMember, 'id'>) => {
    try {
      const response = await guildMembersApi.create(member);
      const newMember = response.data;
      setMembers(prev => [...prev, newMember]);
      return newMember;
    } catch (err) {
      setError('Failed to add guild member');
      console.error('Failed to add guild member:', err);
      throw err;
    }
  };

  // Update guild member
  const updateMember = async (id: number, member: Partial<GuildMember>) => {
    try {
      console.log('Starting to update member:', id, member);
      const response = await guildMembersApi.update(id, member);
      const apiResponse = response.data;
      console.log('Server response:', apiResponse);
      
      // Check API response structure
      if (apiResponse.success && apiResponse.data) {
        const updatedMember = apiResponse.data;
        console.log('Updated member data:', updatedMember);
        
        setMembers(prev => {
          const newMembers = prev.map(m => {
            // Ensure ID comparison type consistency
            if (m.id?.toString() === id.toString()) {
              console.log('Found member to update:', m, 'updating to:', updatedMember);
              return updatedMember;
            }
            return m;
          });
          console.log('Updated member list length:', newMembers.length);
          return newMembers;
        });
        return updatedMember;
      } else {
        console.error('Update member API response format error:', apiResponse);
        throw new Error(apiResponse.error || 'Update failed');
      }
    } catch (err) {
      setError('Failed to update guild member');
      console.error('Failed to update guild member:', err);
      throw err;
    }
  };

  // Delete guild member
  const deleteMember = async (id: number) => {
    try {
      await guildMembersApi.delete(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      setError('Failed to delete guild member');
      console.error('Failed to delete guild member:', err);
      throw err;
    }
  };

  // Delete all guild members
  const deleteAllMembers = async () => {
    try {
      await guildMembersApi.deleteAll();
      setMembers([]);
    } catch (err) {
      setError('Failed to delete all guild members');
      console.error('Failed to delete all guild members:', err);
      throw err;
    }
  };

  // Batch update guild members
  const batchUpdateMembers = async (members: GuildMember[]) => {
    try {
      const response = await guildMembersApi.batchUpdate(members);
      const rawData = response.data;
      const membersData = Array.isArray(rawData) ? rawData : members;
      setMembers(membersData);
      return membersData;
    } catch (err) {
      setError('Failed to batch update guild members');
      console.error('Failed to batch update guild members:', err);
      throw err;
    }
  };

  // Search guild members
  const searchMembers = async (query: string) => {
    try {
      const response = await guildMembersApi.search(query);
      const rawData = response.data;
      return Array.isArray(rawData) ? rawData : [];
    } catch (err) {
      setError('Failed to search guild members');
      console.error('Failed to search guild members:', err);
      return [];
    }
  };

  // Fetch member list on initialization
  useEffect(() => {
    // Only fetch data on first initialization
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchMembers();
    }
    
    // Cleanup function: cancel incomplete requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    fetchMembers,
    addMember,
    updateMember,
    deleteMember,
    deleteAllMembers,
    batchUpdateMembers,
    searchMembers,
  };
};