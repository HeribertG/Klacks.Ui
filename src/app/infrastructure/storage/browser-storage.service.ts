import { Injectable } from '@angular/core';
import { IFilterStorage } from '../../application/interfaces/filter-storage.interface';

@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService implements IFilterStorage {
  private readonly storageKeyPrefix = 'klacks_filter_';

  saveFilter<T>(key: string, filter: T): Promise<boolean> {
    if (!this.checkAvailability()) {
      console.warn('localStorage is not available. Filter could not be saved.');
      return Promise.resolve(false);
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = JSON.stringify(filter);
      localStorage.setItem(storageKey, serializedValue);
      return Promise.resolve(true);
    } catch (error) {
      console.error('Error saving filter to localStorage:', error);
      return Promise.resolve(false);
    }
  }

  restoreFilter<T>(key: string): Promise<T | null> {
    if (!this.checkAvailability()) {
      console.warn('localStorage is not available. Filter could not be restored.');
      return Promise.resolve(null);
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = localStorage.getItem(storageKey);

      if (serializedValue === null) {
        return Promise.resolve(null);
      }

      return Promise.resolve(JSON.parse(serializedValue) as T);
    } catch (error) {
      console.error('Error restoring filter from localStorage:', error);
      return Promise.resolve(null);
    }
  }

  removeFilter(key: string): Promise<boolean> {
    if (!this.checkAvailability()) {
      console.warn('localStorage is not available. Filter could not be removed.');
      return Promise.resolve(false);
    }

    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
      return Promise.resolve(true);
    } catch (error) {
      console.error('Error removing filter from localStorage:', error);
      return Promise.resolve(false);
    }
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.checkAvailability());
  }

  getKeys(prefix?: string): Promise<string[]> {
    if (!this.checkAvailability()) {
      return Promise.resolve([]);
    }

    try {
      const keys: string[] = [];
      const searchPrefix = prefix
        ? this.getStorageKey(prefix)
        : this.storageKeyPrefix;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          const cleanKey = key.replace(this.storageKeyPrefix, '');
          keys.push(cleanKey);
        }
      }

      return Promise.resolve(keys);
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
      return Promise.resolve([]);
    }
  }

  clear(prefix?: string): Promise<boolean> {
    if (!this.checkAvailability()) {
      return Promise.resolve(false);
    }

    try {
      const keys: string[] = [];
      const searchPrefix = prefix
        ? this.getStorageKey(prefix)
        : this.storageKeyPrefix;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        localStorage.removeItem(key);
      }

      return Promise.resolve(true);
    } catch (error) {
      console.error('Error clearing filters from localStorage:', error);
      return Promise.resolve(false);
    }
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__test_storage__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}${key}`;
  }
}
