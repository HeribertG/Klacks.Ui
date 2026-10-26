// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Abstraction for the active-entity search strategy used by UiActionEngine and header search.
 * @param typeFilter - Optional address-type limiter for client lists: 'customer' | 'employee' | 'extern'
 * @param city - Optional customer city for shift lists; undefined leaves the filter alone, an empty string clears it
 * @param zipPrefix - Optional start of the customer postal code for shift lists; undefined leaves the filter alone, an empty string clears it
 */

import { ISearchStrategyOptions } from './search-strategy-options.interface';
import { InjectionToken } from '@angular/core';

export interface ISearchStrategy {
  globalSearch(value: string, isIncludeAddress: boolean, isIncludeClient: boolean, options?: ISearchStrategyOptions): void;
  resetFilter(): void;
  restoreSearch(): string;
  setRestoreSearch(value: string): void;
}

export const SEARCH_STRATEGY = new InjectionToken<ISearchStrategy>('ISearchStrategy');
