// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { IEntitySearchStrategy } from './interfaces/entity-search-strategy.interface';
import { EntitySearchOptions } from './interfaces/entity-search-options.interface';
import { SearchFilterHost } from './interfaces/search-filter-host.interface';

export abstract class BaseEntitySearchStrategy
  implements IEntitySearchStrategy
{
  protected abstract dataManagementService: object;
  protected abstract entityName: EntityName;

  abstract search(value: string, options?: EntitySearchOptions): void;

  resetFilter(): void {
    this.filterHost.currentFilter.searchString = '';
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  getEntityName(): EntityName {
    return this.entityName;
  }

  protected triggerExternalFilterChange(): void {
    this.filterHost.onExternalFilterChange?.();
  }

  private get filterHost(): SearchFilterHost {
    return this.dataManagementService as SearchFilterHost;
  }

  protected abstract refreshData(): void;
}
