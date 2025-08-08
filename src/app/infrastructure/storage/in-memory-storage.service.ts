import { Injectable } from '@angular/core';
import { IFilterStorage } from '../../application/interfaces/filter-storage.interface';

/**
 * In-memory implementation of IFilterStorage for testing and fallback scenarios.
 * This service stores filter data in memory and does not persist between page reloads.
 * 
 * Use cases:
 * - Unit testing with predictable behavior
 * - Fallback when localStorage is not available
 * - Temporary session-only storage
 */
@Injectable()
export class InMemoryStorageService implements IFilterStorage {
  private storage = new Map<string, string>();
  private available = true;

  async saveFilter<T>(key: string, filter: T): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('InMemoryStorage is not available. Filter could not be saved.');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(filter);
      this.storage.set(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error saving filter to memory storage:', error);
      return false;
    }
  }

  async restoreFilter<T>(key: string): Promise<T | null> {
    if (!(await this.isAvailable())) {
      console.warn('InMemoryStorage is not available. Filter could not be restored.');
      return null;
    }

    try {
      const serializedValue = this.storage.get(key);
      
      if (serializedValue === undefined) {
        return null;
      }

      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error('Error restoring filter from memory storage:', error);
      return null;
    }
  }

  async removeFilter(key: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('InMemoryStorage is not available. Filter could not be removed.');
      return false;
    }

    try {
      return this.storage.delete(key);
    } catch (error) {
      console.error('Error removing filter from memory storage:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  async getKeys(prefix?: string): Promise<string[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    try {
      const keys = Array.from(this.storage.keys());
      
      if (prefix) {
        return keys.filter(key => key.startsWith(prefix));
      }

      return keys;
    } catch (error) {
      console.error('Error getting keys from memory storage:', error);
      return [];
    }
  }

  async clear(prefix?: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }

    try {
      if (prefix) {
        const keysToRemove = await this.getKeys(prefix);
        for (const key of keysToRemove) {
          this.storage.delete(key);
        }
      } else {
        this.storage.clear();
      }

      return true;
    } catch (error) {
      console.error('Error clearing memory storage:', error);
      return false;
    }
  }

  /**
   * Test utility method to disable storage (for testing error scenarios)
   * @param available - Whether storage should be available
   */
  setAvailable(available: boolean): void {
    this.available = available;
  }

  /**
   * Test utility method to get storage size
   * @returns The number of stored items
   */
  size(): number {
    return this.storage.size;
  }

  /**
   * Test utility method to check if a key exists
   * @param key - The key to check
   * @returns True if key exists, false otherwise
   */
  hasKey(key: string): boolean {
    return this.storage.has(key);
  }
}