import { InjectionToken } from '@angular/core';

export interface IFilterStorage {
  saveFilter<T>(key: string, filter: T): Promise<boolean>;

  restoreFilter<T>(key: string): Promise<T | null>;

  removeFilter(key: string): Promise<boolean>;

  isAvailable(): Promise<boolean>;

  getKeys(prefix?: string): Promise<string[]>;

  clear(prefix?: string): Promise<boolean>;
}

export const FILTER_STORAGE_TOKEN = new InjectionToken<IFilterStorage>('FILTER_STORAGE');