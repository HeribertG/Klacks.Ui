/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import {
  IEntitySearchStrategy,
  EntitySearchOptions,
} from './interfaces/entity-search-strategy.interface';

export abstract class BaseEntitySearchStrategy
  implements IEntitySearchStrategy
{
  protected abstract dataManagementService: any;
  protected abstract entityName: EntityName;

  abstract search(value: string, options?: EntitySearchOptions): void;

  resetFilter(): void {
    this.dataManagementService.currentFilter.searchString = '';
    this.triggerExternalFilterChange();
    this.refreshData();
  }

  getEntityName(): EntityName {
    return this.entityName;
  }

  protected triggerExternalFilterChange(): void {
    if (this.dataManagementService.onExternalFilterChange) {
      this.dataManagementService.onExternalFilterChange();
    }
  }

  protected abstract refreshData(): void;
}
