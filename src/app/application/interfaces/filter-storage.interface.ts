import { InjectionToken } from '@angular/core';

/**
 * Interface for filter storage operations following Clean Architecture principles.
 * This abstraction allows different storage implementations (localStorage, sessionStorage, in-memory, etc.)
 * without the business logic being coupled to a specific storage mechanism.
 */
export interface IFilterStorage {
  /**
   * Saves a filter object to storage with the specified key.
   * @param key - The storage key to use
   * @param filter - The filter object to save
   * @returns Promise<boolean> - True if save was successful, false otherwise
   */
  saveFilter<T>(key: string, filter: T): Promise<boolean>;

  /**
   * Retrieves a filter object from storage by key.
   * @param key - The storage key to retrieve
   * @returns Promise<T | null> - The filter object if found, null otherwise
   */
  restoreFilter<T>(key: string): Promise<T | null>;

  /**
   * Removes a filter from storage by key.
   * @param key - The storage key to remove
   * @returns Promise<boolean> - True if removal was successful, false otherwise
   */
  removeFilter(key: string): Promise<boolean>;

  /**
   * Checks if the storage mechanism is available and functional.
   * @returns Promise<boolean> - True if storage is available, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Gets all keys that match a given prefix.
   * @param prefix - Optional prefix to filter keys
   * @returns Promise<string[]> - Array of matching keys
   */
  getKeys(prefix?: string): Promise<string[]>;

  /**
   * Clears all stored filters, optionally matching a prefix.
   * @param prefix - Optional prefix to filter which keys to clear
   * @returns Promise<boolean> - True if clearing was successful, false otherwise
   */
  clear(prefix?: string): Promise<boolean>;
}

/**
 * Injection token for IFilterStorage to enable dependency injection.
 */
export const FILTER_STORAGE_TOKEN = new InjectionToken<IFilterStorage>('FILTER_STORAGE');