/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, inject } from '@angular/core';
import {
  IEntitySearchStrategy,
  EntitySearchOptions,
} from './interfaces/entity-search-strategy.interface';
import { EntityName } from 'src/app/domain/models/entity-names.enum';
import { SearchStateService } from 'src/app/application/services/search-state.service';

@Injectable({
  providedIn: 'root',
})
export class ContainerTemplateSearchStrategy implements IEntitySearchStrategy {
  private searchStateService = inject(SearchStateService);

  search(value: string, options: EntitySearchOptions = {}): void {
    this.searchStateService.setContainerTemplateSearch(value);
  }

  resetFilter(): void {
    this.searchStateService.clearContainerTemplateSearch();
  }

  getEntityName(): EntityName {
    return EntityName.SHIFT_CONTAINER_TEMPLATE;
  }
}
