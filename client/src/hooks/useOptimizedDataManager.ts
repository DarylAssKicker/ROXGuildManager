/**
 * Optimized Data Management Hook
 * 1. Classes configuration uses global singleton, loaded only once
 * 2. Participation data uses batch API to fetch all members at once
 * 3. Smart cache management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { aaApi, gvgApi } from '../services/api';
import { globalClassesManager } from '../services/GlobalClassesManager';
import { GuildMember } from '../types';

interface ParticipationData {
  [memberName: string]: { [date: string]: boolean };
}

interface ClassInfo {
  id: string;
  name: string;
  color?: string;
}

export const useOptimizedDataManager = (members: GuildMember[]) => {
  // Classes related state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  
  // Participation related state
  const [aaParticipation, setAAParticipation] = useState<ParticipationData>({});
  const [gvgParticipation, setGVGParticipation] = useState<ParticipationData>({});
  const [aaLoading, setAALoading] = useState(false);
  const [gvgLoading, setGVGLoading] = useState(false);
  
  // Cache management
  const participationCacheRef = useRef<{
    aa: { data: ParticipationData; timestamp: number } | null;
    gvg: { data: ParticipationData; timestamp: number } | null;
  }>({
    aa: null,
    gvg: null
  });
  
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes cache

  // Check if cache is valid
  const isCacheValid = (cache: { data: ParticipationData; timestamp: number } | null): boolean => {
    if (!cache) return false;
    return (Date.now() - cache.timestamp) < CACHE_EXPIRY;
  };

  // Classes management - using global singleton
  const loadClasses = useCallback(async () => {
    if (globalClassesManager.isClassesLoaded()) {
      setClasses(globalClassesManager.getLoadedClasses());
      return;
    }

    setClassesLoading(true);
    try {
      const classesData = await globalClassesManager.getClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  // Batch load AA participation data
  const loadAAParticipation = useCallback(async (forceReload = false) => {
    if (members.length === 0) {
      setAAParticipation({});
      return;
    }

    // Check cache
    const cache = participationCacheRef.current.aa;
    if (!forceReload && isCacheValid(cache)) {
      console.log('Loading AA participation from cache');
      setAAParticipation(cache!.data);
      return;
    }

    setAALoading(true);
    try {
      console.log('Loading AA participation from API (batch request)');
      const response = await aaApi.getAllMembersParticipation();
      
      if (response.data.success) {
        const participationData = response.data.data || {};
        setAAParticipation(participationData);
        
        // Update cache
        participationCacheRef.current.aa = {
          data: participationData,
          timestamp: Date.now()
        };
        
        console.log(`Successfully loaded AA participation for ${Object.keys(participationData).length} members`);
      } else {
        setAAParticipation({});
      }
    } catch (error) {
      console.error('Failed to load AA participation:', error);
      setAAParticipation({});
    } finally {
      setAALoading(false);
    }
  }, [members]);

  // Batch load GVG participation data
  const loadGVGParticipation = useCallback(async (forceReload = false) => {
    if (members.length === 0) {
      setGVGParticipation({});
      return;
    }

    // Check cache
    const cache = participationCacheRef.current.gvg;
    if (!forceReload && isCacheValid(cache)) {
      console.log('Loading GVG participation from cache');
      setGVGParticipation(cache!.data);
      return;
    }

    setGVGLoading(true);
    try {
      console.log('Loading GVG participation from API (batch request)');
      const response = await gvgApi.getAllMembersParticipation();
      
      if (response.data.success) {
        const participationData = response.data.data || {};
        setGVGParticipation(participationData);
        
        // Update cache
        participationCacheRef.current.gvg = {
          data: participationData,
          timestamp: Date.now()
        };
        
        console.log(`Successfully loaded GVG participation for ${Object.keys(participationData).length} members`);
      } else {
        setGVGParticipation({});
      }
    } catch (error) {
      console.error('Failed to load GVG participation:', error);
      setGVGParticipation({});
    } finally {
      setGVGLoading(false);
    }
  }, [members]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    // Clear local cache
    participationCacheRef.current = { aa: null, gvg: null };
    
    // Force reload classes (though usually not needed)
    await globalClassesManager.reloadClasses();
    
    // Load all data in parallel
    await Promise.all([
      loadClasses(),
      loadAAParticipation(true),
      loadGVGParticipation(true)
    ]);
  }, [loadClasses, loadAAParticipation, loadGVGParticipation]);

  // Clear participation cache (when member list changes)
  const clearParticipationCache = useCallback(() => {
    participationCacheRef.current = { aa: null, gvg: null };
    setAAParticipation({});
    setGVGParticipation({});
  }, []);

  // Convenient method to get class color
  const getClassColor = useCallback((className: string) => {
    return globalClassesManager.getClassColor(className);
  }, []);

  // Initialize classes configuration
  useEffect(() => {
    loadClasses();
    
    // Listen to classes changes
    const handleClassesChange = (newClasses: ClassInfo[]) => {
      setClasses(newClasses);
    };
    
    globalClassesManager.addListener(handleClassesChange);
    
    return () => {
      globalClassesManager.removeListener(handleClassesChange);
    };
  }, [loadClasses]);

  // Load participation data when member list changes
  useEffect(() => {
    if (members.length > 0) {
      loadAAParticipation();
      loadGVGParticipation();
    }
  }, [members, loadAAParticipation, loadGVGParticipation]);

  return {
    // Data
    classes,
    aaParticipation,
    gvgParticipation,
    
    // Loading states
    classesLoading,
    aaLoading,
    gvgLoading,
    loading: classesLoading || aaLoading || gvgLoading,
    
    // Methods
    loadClasses,
    loadAAParticipation,
    loadGVGParticipation,
    refreshAllData,
    clearParticipationCache,
    getClassColor,
    
    // Cache status
    cacheStatus: {
      aa: isCacheValid(participationCacheRef.current.aa),
      gvg: isCacheValid(participationCacheRef.current.gvg),
      classes: globalClassesManager.isClassesLoaded()
    }
  };
};