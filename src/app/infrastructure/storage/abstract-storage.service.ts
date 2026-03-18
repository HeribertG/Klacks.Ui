// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Abstrakte Basisklasse fuer localStorage- und sessionStorage-basierte Services.
 * @param storage - Die konkrete Storage-Instanz (localStorage oder sessionStorage)
 * @param storageName - Anzeigename fuer Log-Meldungen (z.B. 'localStorage', 'sessionStorage')
 */

import { IFilterStorage } from '../../application/interfaces/filter-storage.interface';

const STORAGE_KEY_PREFIX = 'klacks_filter_';

export abstract class AbstractStorageService implements IFilterStorage {
  protected abstract readonly storage: Storage;
  protected abstract readonly storageName: string;

  saveFilter<T>(key: string, filter: T): Promise<boolean> {
    if (!this.checkAvailability()) {
      console.warn(`${this.storageName} is not available. Filter could not be saved.`);
      return Promise.resolve(false);
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = JSON.stringify(filter);
      this.storage.setItem(storageKey, serializedValue);
      return Promise.resolve(true);
    } catch (error) {
      console.error(`Error saving filter to ${this.storageName}:`, error);
      return Promise.resolve(false);
    }
  }

  restoreFilter<T>(key: string): Promise<T | null> {
    if (!this.checkAvailability()) {
      console.warn(`${this.storageName} is not available. Filter could not be restored.`);
      return Promise.resolve(null);
    }

    try {
      const storageKey = this.getStorageKey(key);
      const serializedValue = this.storage.getItem(storageKey);

      if (serializedValue === null) {
        return Promise.resolve(null);
      }

      return Promise.resolve(JSON.parse(serializedValue) as T);
    } catch (error) {
      console.error(`Error restoring filter from ${this.storageName}:`, error);
      return Promise.resolve(null);
    }
  }

  removeFilter(key: string): Promise<boolean> {
    if (!this.checkAvailability()) {
      console.warn(`${this.storageName} is not available. Filter could not be removed.`);
      return Promise.resolve(false);
    }

    try {
      const storageKey = this.getStorageKey(key);
      this.storage.removeItem(storageKey);
      return Promise.resolve(true);
    } catch (error) {
      console.error(`Error removing filter from ${this.storageName}:`, error);
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
        : STORAGE_KEY_PREFIX;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          const cleanKey = key.replace(STORAGE_KEY_PREFIX, '');
          keys.push(cleanKey);
        }
      }

      return Promise.resolve(keys);
    } catch (error) {
      console.error(`Error getting keys from ${this.storageName}:`, error);
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
        : STORAGE_KEY_PREFIX;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        this.storage.removeItem(key);
      }

      return Promise.resolve(true);
    } catch (error) {
      console.error(`Error clearing filters from ${this.storageName}:`, error);
      return Promise.resolve(false);
    }
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__test_storage__';
      this.storage.setItem(testKey, testKey);
      this.storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${STORAGE_KEY_PREFIX}${key}`;
  }
}
