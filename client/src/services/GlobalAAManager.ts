/**
 * Global AA Data Manager
 * Ensures AA data is loaded only once and shared globally
 */

import { aaApi } from './api';
import { AAInfo } from '../types';

interface AADataState {
  serverData: AAInfo[];
  statistics: any;
  isLoaded: boolean;
  lastLoadTime: number;
}

class GlobalAAManager {
  private static instance: GlobalAAManager;
  private dataState: AADataState = {
    serverData: [],
    statistics: null,
    isLoaded: false,
    lastLoadTime: 0
  };
  private isLoading = false;
  private loadPromise: Promise<AADataState> | null = null;
  private listeners: Set<(state: AADataState) => void> = new Set();

  private constructor() {}

  static getInstance(): GlobalAAManager {
    if (!GlobalAAManager.instance) {
      GlobalAAManager.instance = new GlobalAAManager();
    }
    return GlobalAAManager.instance;
  }

  /**
   * Get AA data (auto-load if not loaded)
   */
  async getData(): Promise<AADataState> {
    if (this.isLoaded && this.isCacheValid()) {
      console.log('Using cached AA data, total', this.dataState.serverData.length, 'records');
      return this.dataState;
    }

    if (this.isLoading && this.loadPromise) {
      console.log('AA data loading in progress, waiting...');
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
      console.error('Failed to load AA data:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Get currently loaded data (synchronous method)
   */
  getLoadedData(): AADataState {
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
  addListener(listener: (state: AADataState) => void): void {
    this.listeners.add(listener);
    // If already loaded, call listener immediately
    if (this.dataState.isLoaded) {
      listener(this.dataState);
    }
  }

  /**
   * Remove listener
   */
  removeListener(listener: (state: AADataState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Force reload data
   */
  async reloadData(): Promise<AADataState> {
    console.log('Force reloading AA data...');
    this.dataState.isLoaded = false;
    return this.getData();
  }

  /**
   * Update data after import/delete operations
   */
  async refreshData(): Promise<void> {
    console.log('Refreshing AA data after changes...');
    this.dataState.isLoaded = false;
    await this.getData();
  }

  /**
   * Load data from API
   */
  private async loadDataFromAPI(): Promise<AADataState> {
    console.log('Loading AA data from API (global singleton)');
    
    // Get date range for batch fetching
    const datesResponse = await aaApi.getAllDates();
    let serverData: AAInfo[] = [];
    let statistics = null;

    if (datesResponse.data.success && datesResponse.data.data.length > 0) {
      const dates = datesResponse.data.data;
      const startDate = dates[dates.length - 1]; // oldest date
      const endDate = dates[0]; // newest date
      
      // Batch fetch data using date range
      const dataResponse = await aaApi.getByDateRange(startDate, endDate);
      if (dataResponse.data.success) {
        serverData = dataResponse.data.data;
        
        // Sort by date in descending order (newest first)
        serverData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log('Loaded AA data from API:', serverData.length, 'records');
      } else {
        console.log('Failed to fetch AA data by date range:', dataResponse.data?.message || 'Unknown error');
      }
    } else {
      console.log('No AA dates available');
    }
    
    // Load statistics
    try {
      const statsResponse = await aaApi.getStatistics();
      if (statsResponse.data.success) {
        statistics = statsResponse.data.data;
        console.log('Loaded AA statistics');
      }
    } catch (error) {
      console.log('Failed to load AA statistics:', error);
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
        console.error('Error in AA data listener:', error);
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
export const globalAAManager = GlobalAAManager.getInstance();
export default globalAAManager;