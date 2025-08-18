/**
 * Global GVG Data Manager
 * Ensures GVG data is loaded only once and shared globally
 */

import { gvgApi } from './api';
import { GVGInfo } from '../types';

interface GVGDataState {
  serverData: GVGInfo[];
  statistics: any;
  isLoaded: boolean;
  lastLoadTime: number;
}

class GlobalGVGManager {
  private static instance: GlobalGVGManager;
  private dataState: GVGDataState = {
    serverData: [],
    statistics: null,
    isLoaded: false,
    lastLoadTime: 0
  };
  private isLoading = false;
  private loadPromise: Promise<GVGDataState> | null = null;
  private listeners: Set<(state: GVGDataState) => void> = new Set();

  private constructor() {}

  static getInstance(): GlobalGVGManager {
    if (!GlobalGVGManager.instance) {
      GlobalGVGManager.instance = new GlobalGVGManager();
    }
    return GlobalGVGManager.instance;
  }

  /**
   * Get GVG data (auto-load if not loaded)
   */
  async getData(): Promise<GVGDataState> {
    if (this.isLoaded && this.isCacheValid()) {
      console.log('Using cached GVG data, total', this.dataState.serverData.length, 'records');
      return this.dataState;
    }

    if (this.isLoading && this.loadPromise) {
      console.log('GVG data loading in progress, waiting...');
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.loadDataFromAPI();

    try {
      const state = await this.loadPromise;
      this.dataState = state;
      this.dataState.isLoaded = true;
      this.dataState.lastLoadTime = Date.now();
      this.notifyListeners();
      return state;
    } catch (error) {
      console.error('Failed to load GVG data:', error);
      // For GVG, we handle 404/503 errors gracefully
      if (error.response?.status === 404 || error.response?.status === 503) {
        console.log('GVG service endpoint not yet implemented, this is normal');
        const emptyState: GVGDataState = {
          serverData: [],
          statistics: null,
          isLoaded: true,
          lastLoadTime: Date.now()
        };
        this.dataState = emptyState;
        this.notifyListeners();
        return emptyState;
      }
      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Get currently loaded data (synchronous method)
   */
  getLoadedData(): GVGDataState {
    return { ...this.dataState };
  }

  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return this.dataState.isLoaded;
  }

  /**
   * Check if cache is still valid (within 5 minutes)
   */
  private isCacheValid(): boolean {
    const cacheAge = Date.now() - this.dataState.lastLoadTime;
    return cacheAge < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Add listener, called when data is updated
   */
  addListener(listener: (state: GVGDataState) => void): void {
    this.listeners.add(listener);
    // If already loaded, call listener immediately
    if (this.dataState.isLoaded) {
      listener(this.dataState);
    }
  }

  /**
   * Remove listener
   */
  removeListener(listener: (state: GVGDataState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Force reload data
   */
  async reloadData(): Promise<GVGDataState> {
    console.log('Force reloading GVG data...');
    this.dataState.isLoaded = false;
    return this.getData();
  }

  /**
   * Update data after import/delete operations
   */
  async refreshData(): Promise<void> {
    console.log('Refreshing GVG data after changes...');
    this.dataState.isLoaded = false;
    await this.getData();
  }

  /**
   * Load data from API
   */
  private async loadDataFromAPI(): Promise<GVGDataState> {
    console.log('Loading GVG data from API (global singleton)');
    
    // Get date range for batch fetching
    const datesResponse = await gvgApi.getAllDates();
    let serverData: GVGInfo[] = [];
    let statistics = null;

    if (datesResponse.data.success && datesResponse.data.data.length > 0) {
      const dates = datesResponse.data.data;
      const startDate = dates[dates.length - 1]; // oldest date
      const endDate = dates[0]; // newest date
      
      // Batch fetch data using date range
      const dataResponse = await gvgApi.getByDateRange(startDate, endDate);
      if (dataResponse.data.success) {
        serverData = dataResponse.data.data;
        
        // Sort by date in descending order (newest first)
        serverData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log('Loaded GVG data from API:', serverData.length, 'records');
      } else {
        console.log('Failed to fetch GVG data by date range:', dataResponse.data?.message || 'Unknown error');
      }
    } else {
      // Server returned failure, but might just be no data
      console.log('Server has no GVG data:', datesResponse.data?.message || 'No dates available');
    }
    
    // Load statistics
    try {
      const statsResponse = await gvgApi.getStatistics();
      if (statsResponse.data.success) {
        statistics = statsResponse.data.data;
        console.log('Loaded GVG statistics');
      }
    } catch (statsError) {
      // Statistics loading failure doesn't affect main functionality
      console.log('GVG statistics temporarily unavailable');
    }

    return {
      serverData,
      statistics,
      isLoaded: true,
      lastLoadTime: Date.now()
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.dataState);
      } catch (error) {
        console.error('Error in GVG data listener:', error);
      }
    });
  }

  /**
   * Clear cache (for testing or reset)
   */
  clearCache(): void {
    this.dataState = {
      serverData: [],
      statistics: null,
      isLoaded: false,
      lastLoadTime: 0
    };
    this.notifyListeners();
  }
}

// Export singleton instance
export const globalGVGManager = GlobalGVGManager.getInstance();
export default globalGVGManager;