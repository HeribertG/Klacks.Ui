import { Injectable } from '@angular/core';
import { IFilterStorage } from '../../application/interfaces/filter-storage.interface';

@Injectable({
  providedIn: 'root'
})
export class SessionStorageService implements IFilterStorage {
  private readonly storageKeyPrefix = 'klacks_filter_';

  async saveFilter<T>(key: string, filter: T): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('sessionStorage is not available. Filter could not be saved.');
      return false;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = JSON.stringify(filter);
      sessionStorage.setItem(storageKey, serializedValue);
      return true;
    } catch (error) {
      console.error('Error saving filter to sessionStorage:', error);
      return false;
    }
  }

  async restoreFilter<T>(key: string): Promise<T | null> {
    if (!(await this.isAvailable())) {
      console.warn('sessionStorage is not available. Filter could not be restored.');
      return null;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = sessionStorage.getItem(storageKey);
      
      if (serializedValue === null) {
        return null;
      }

      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error('Error restoring filter from sessionStorage:', error);
      return null;
    }
  }

  async removeFilter(key: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.warn('sessionStorage is not available. Filter could not be removed.');
      return false;
    }

    try {
      const storageKey = this.getStorageKey(key);
      sessionStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('Error removing filter from sessionStorage:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__test_session_storage__';
      sessionStorage.setItem(testKey, testKey);
      sessionStorage.removeItem(testKey);
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

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          const cleanKey = key.replace(this.storageKeyPrefix, '');
          keys.push(cleanKey);
        }
      }

      return keys;
    } catch (error) {
      console.error('Error getting keys from sessionStorage:', error);
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
        sessionStorage.removeItem(storageKey);
      }

      return true;
    } catch (error) {
      console.error('Error clearing filters from sessionStorage:', error);
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}${key}`;
  }
}