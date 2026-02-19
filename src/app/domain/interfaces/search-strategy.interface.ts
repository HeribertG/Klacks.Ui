import { InjectionToken } from '@angular/core';

export interface ISearchStrategy {
  globalSearch(value: string, isIncludeAddress: boolean, isIncludeClient: boolean): void;
  resetFilter(): void;
  restoreSearch(): string;
  setRestoreSearch(value: string): void;
}

export const SEARCH_STRATEGY = new InjectionToken<ISearchStrategy>('ISearchStrategy');
