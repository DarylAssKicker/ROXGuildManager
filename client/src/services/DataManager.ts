// DataManager singleton - manages application data state
class DataManager {
  private static instance: DataManager;
  private guildMembers: any[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Private constructor to ensure singleton pattern
  }

  // Get singleton instance
  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // Set guild member data
  public setGuildMembers(members: any[]): void {
    this.guildMembers = [...members];
    this.notifyListeners();
  }

  // Get guild member data
  public getGuildMembers(): any[] {
    return [...this.guildMembers];
  }

  // Find guild member by name
  public findGuildMemberByName(name: string): any | undefined {
    const cleanName = name?.trim();
    return this.guildMembers.find(member => member.name?.trim() === cleanName);
  }

  // Get total number of guild members
  public getGuildMemberCount(): number {
    return this.guildMembers.length;
  }

  // Update guild member name
  public async updateGuildMemberName(memberId: number, newName: string): Promise<void> {
    const memberIndex = this.guildMembers.findIndex(member => member.id === memberId);
    if (memberIndex !== -1) {
      // Update local data first
      this.guildMembers[memberIndex] = {
        ...this.guildMembers[memberIndex],
        name: newName
      };
      
      try {
        // Call API to update server data
        const { guildMembersApi } = await import('./api');
        await guildMembersApi.update(memberId, { name: newName });
        console.log(`Successfully updated guild member ${memberId} name to: ${newName}`);
      } catch (error) {
        console.error('Failed to update guild member name to server:', error);
        // If API call fails, can choose to rollback local data or show error message
        // Here we choose to keep local changes but log the error
      }
      
      this.notifyListeners();
    }
  }

  // Add data change listener
  public addListener(callback: () => void): void {
    this.listeners.add(callback);
  }

  // Remove data change listener
  public removeListener(callback: () => void): void {
    this.listeners.delete(callback);
  }

  // Notify all listeners that data has changed
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // Clear data (for testing or reset)
  public clear(): void {
    this.guildMembers = [];
    this.notifyListeners();
  }
}

export default DataManager;