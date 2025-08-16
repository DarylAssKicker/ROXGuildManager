/**
 * Global Classes Configuration Manager
 * Ensures classes data is loaded only once and shared globally
 */

import { classesApi } from './api';

interface ClassInfo {
  id: string;
  name: string;
  color?: string;
}

class GlobalClassesManager {
  private static instance: GlobalClassesManager;
  private classes: ClassInfo[] = [];
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<ClassInfo[]> | null = null;
  private listeners: Set<(classes: ClassInfo[]) => void> = new Set();

  private constructor() {}

  static getInstance(): GlobalClassesManager {
    if (!GlobalClassesManager.instance) {
      GlobalClassesManager.instance = new GlobalClassesManager();
    }
    return GlobalClassesManager.instance;
  }

  /**
   * Get classes configuration (auto-load if not loaded)
   */
  async getClasses(): Promise<ClassInfo[]> {
    if (this.isLoaded) {
      return this.classes;
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.loadClassesFromAPI();

    try {
      const classes = await this.loadPromise;
      this.classes = classes;
      this.isLoaded = true;
      this.notifyListeners();
      return classes;
    } catch (error) {
      console.error('Failed to load classes:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Get currently loaded classes (synchronous method)
   */
  getLoadedClasses(): ClassInfo[] {
    return this.classes;
  }

  /**
   * Check if classes are loaded
   */
  isClassesLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Add listener, called when classes data is updated
   */
  addListener(listener: (classes: ClassInfo[]) => void): void {
    this.listeners.add(listener);
    // If already loaded, call listener immediately
    if (this.isLoaded) {
      listener(this.classes);
    }
  }

  /**
   * Remove listener
   */
  removeListener(listener: (classes: ClassInfo[]) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Force reload classes configuration
   */
  async reloadClasses(): Promise<ClassInfo[]> {
    this.isLoaded = false;
    return this.getClasses();
  }

  /**
   * Load classes configuration from API
   */
  private async loadClassesFromAPI(): Promise<ClassInfo[]> {
    console.log('Loading classes from API (global singleton)');
    const response = await classesApi.getAll();
    return response.data.data || [];
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.classes);
      } catch (error) {
        console.error('Error in classes listener:', error);
      }
    });
  }

  /**
   * Find class information by name
   */
  findClassByName(name: string): ClassInfo | undefined {
    return this.classes.find(c => c.name === name);
  }

  /**
   * Get class color
   */
  getClassColor(className: string): string {
    const classInfo = this.findClassByName(className);
    return classInfo?.color || '#f0f0f0';
  }
}

// Export singleton instance
export const globalClassesManager = GlobalClassesManager.getInstance();
export default globalClassesManager;