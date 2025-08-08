import { Injectable } from '@angular/core';
import { IFilterStorage } from '../../application/interfaces/filter-storage.interface';

/**
 * Browser localStorage implementation of IFilterStorage.
 * This service handles all localStorage operations for filter persistence.
 * 
 * Features:
 * - Automatic availability checking
 * - Error handling with fallback behavior
 * - JSON serialization/deserialization
 * - Prefix-based key management
 */
@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService implements IFilterStorage {
  private readonly storageKeyPrefix = 'klacks_filter_';

  async saveFilter<T>(key: string, filter: T): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('localStorage is not available. Filter could not be saved.');
      return false;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = JSON.stringify(filter);
      localStorage.setItem(storageKey, serializedValue);
      return true;
    } catch (error) {
      console.error('Error saving filter to localStorage:', error);
      return false;
    }
  }

  async restoreFilter<T>(key: string): Promise<T | null> {
    if (!(await this.isAvailable())) {
      console.warn('localStorage is not available. Filter could not be restored.');
      return null;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = localStorage.getItem(storageKey);
      
      if (serializedValue === null) {
        return null;
      }

      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error('Error restoring filter from localStorage:', error);
      return null;
    }
  }

  async removeFilter(key: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('localStorage is not available. Filter could not be removed.');
      return false;
    }

    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('Error removing filter from localStorage:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__test_storage__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async getKeys(prefix?: string): Promise<string[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    try {
      const keys: string[] = [];
      const searchPrefix = prefix 
        ? this.getStorageKey(prefix)
        : this.storageKeyPrefix;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          // Return the key without the internal prefix
          const cleanKey = key.replace(this.storageKeyPrefix, '');
          keys.push(cleanKey);
        }
      }

      return keys;
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
      return [];
    }
  }

  async clear(prefix?: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }

    try {
      const keysToRemove = await this.getKeys(prefix);
      
      for (const key of keysToRemove) {
        const storageKey = this.getStorageKey(key);
        localStorage.removeItem(storageKey);
      }

      return true;
    } catch (error) {
      console.error('Error clearing filters from localStorage:', error);
      return false;
    }
  }

  /**
   * Generates the full storage key with prefix
   * @param key - The logical key name
   * @returns The prefixed storage key
   */
  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}${key}`;
  }
}